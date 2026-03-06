import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { LogEntry } from '../shared/types';

const MAX_BUFFER = 500;
const buffer: LogEntry[] = [];
let logFilePath: string | null = null;

const SOURCE_REGEX = /^\[([a-z-]+)\]\s*/;

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function parseSource(firstArg: string): { source: string; rest: string } {
  const match = SOURCE_REGEX.exec(firstArg);
  if (match) {
    return { source: match[1], rest: firstArg.slice(match[0].length) };
  }
  return { source: 'app', rest: firstArg };
}

function captureLog(level: 'error' | 'warn', args: unknown[]): void {
  if (args.length === 0) return;

  const firstStr = typeof args[0] === 'string' ? args[0] : formatArg(args[0]);
  const { source, rest } = parseSource(firstStr);

  const messageParts = [rest, ...args.slice(1).map(formatArg)].filter(Boolean);
  const message = messageParts.join(' ');

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
  };

  if (buffer.length >= MAX_BUFFER) {
    buffer.shift();
  }
  buffer.push(entry);

  if (logFilePath) {
    const levelTag = level.toUpperCase();
    const line = `[${entry.timestamp}] [${levelTag}] [${source}] ${message}\n`;
    try {
      fs.appendFileSync(logFilePath, line);
    } catch {
      // Can't log a logging failure
    }
  }

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('log-entry', entry);
    }
  }
}

export function initLogger(): void {
  logFilePath = path.join(app.getPath('userData'), 'error_logs.txt');

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);
    captureLog('error', args);
  };

  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args);
    captureLog('warn', args);
  };
}

export function getBufferedLogs(): LogEntry[] {
  return [...buffer];
}
