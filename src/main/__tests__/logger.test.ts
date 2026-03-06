import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted ensures these are available inside vi.mock factories (which are hoisted)
const { mockSend, mockIsDestroyed, mockAppendFileSync } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockIsDestroyed: vi.fn(() => false),
  mockAppendFileSync: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-wall-paprika'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        isDestroyed: mockIsDestroyed,
        webContents: { send: mockSend },
      },
    ]),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    appendFileSync: mockAppendFileSync,
  },
}));

let originalError: typeof console.error;
let originalWarn: typeof console.warn;

beforeEach(() => {
  vi.clearAllMocks();
  originalError = console.error;
  originalWarn = console.warn;
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

import { initLogger, getBufferedLogs } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    initLogger();
  });

  describe('initLogger', () => {
    it('patches console.error to capture log entries', () => {
      const before = getBufferedLogs().length;
      console.error('[batch] Download failed');
      const logs = getBufferedLogs();

      expect(logs.length).toBe(before + 1);
      const entry = logs[logs.length - 1];
      expect(entry.level).toBe('error');
      expect(entry.source).toBe('batch');
      expect(entry.message).toBe('Download failed');
    });

    it('patches console.warn to capture log entries', () => {
      const before = getBufferedLogs().length;
      console.warn('[unsplash] Rate limit low');
      const logs = getBufferedLogs();

      expect(logs.length).toBe(before + 1);
      const entry = logs[logs.length - 1];
      expect(entry.level).toBe('warn');
      expect(entry.source).toBe('unsplash');
      expect(entry.message).toBe('Rate limit low');
    });

    it('still calls the original console methods', () => {
      const origError = vi.fn();
      const origWarn = vi.fn();
      console.error = origError;
      console.warn = origWarn;
      initLogger();

      console.error('[test] error msg');
      console.warn('[test] warn msg');

      expect(origError).toHaveBeenCalledWith('[test] error msg');
      expect(origWarn).toHaveBeenCalledWith('[test] warn msg');
    });
  });

  describe('source parsing', () => {
    it('parses [source] prefix from first argument', () => {
      const before = getBufferedLogs().length;
      console.error('[rotation] Failed to rotate');
      const entry = getBufferedLogs()[before];

      expect(entry.source).toBe('rotation');
      expect(entry.message).toBe('Failed to rotate');
    });

    it('defaults source to "app" when no bracket prefix', () => {
      const before = getBufferedLogs().length;
      console.error('Something went wrong');
      const entry = getBufferedLogs()[before];

      expect(entry.source).toBe('app');
      expect(entry.message).toBe('Something went wrong');
    });

    it('handles hyphenated source names', () => {
      const before = getBufferedLogs().length;
      console.error('[photo-pool] Prefetch failed');
      const entry = getBufferedLogs()[before];

      expect(entry.source).toBe('photo-pool');
      expect(entry.message).toBe('Prefetch failed');
    });
  });

  describe('argument formatting', () => {
    it('joins multiple string arguments', () => {
      const before = getBufferedLogs().length;
      console.error('[batch] Failed to download', 'photo123');
      const entry = getBufferedLogs()[before];

      expect(entry.message).toBe('Failed to download photo123');
    });

    it('stringifies Error objects to stack or message', () => {
      const before = getBufferedLogs().length;
      const err = new Error('network timeout');
      console.error('[batch] Download failed:', err);
      const entry = getBufferedLogs()[before];

      expect(entry.message).toContain('Download failed:');
      expect(entry.message).toContain('network timeout');
    });

    it('JSON-stringifies objects', () => {
      const before = getBufferedLogs().length;
      console.error('[test] Data:', { key: 'value' });
      const entry = getBufferedLogs()[before];

      expect(entry.message).toContain('{"key":"value"}');
    });

    it('handles number arguments', () => {
      const before = getBufferedLogs().length;
      console.error('[test] Count:', 42);
      const entry = getBufferedLogs()[before];

      expect(entry.message).toContain('42');
    });

    it('ignores empty args', () => {
      const before = getBufferedLogs().length;
      console.error();
      expect(getBufferedLogs().length).toBe(before);
    });
  });

  describe('file logging', () => {
    it('appends formatted line to error_logs.txt', () => {
      console.error('[batch] Test message');

      expect(mockAppendFileSync).toHaveBeenCalled();
      const [filePath, line] = mockAppendFileSync.mock.calls.at(-1) as [string, string];
      expect(filePath).toBe('/tmp/test-wall-paprika/error_logs.txt');
      expect(line).toMatch(/^\[.*\] \[ERROR\] \[batch\] Test message\n$/);
    });

    it('writes WARN level tag for warnings', () => {
      console.warn('[unsplash] Rate limit low');

      const [, line] = mockAppendFileSync.mock.calls.at(-1) as [string, string];
      expect(line).toMatch(/\[WARN\]/);
    });

    it('does not crash when file write fails', () => {
      mockAppendFileSync.mockImplementationOnce(() => {
        throw new Error('disk full');
      });

      expect(() => console.error('[test] should not crash')).not.toThrow();
    });
  });

  describe('renderer push', () => {
    it('sends log entry to all BrowserWindows', () => {
      console.error('[batch] Test push');

      expect(mockSend).toHaveBeenCalledWith(
        'log-entry',
        expect.objectContaining({
          level: 'error',
          source: 'batch',
          message: 'Test push',
        }),
      );
    });

    it('skips destroyed windows', () => {
      mockIsDestroyed.mockReturnValueOnce(true);
      mockSend.mockClear();

      console.error('[test] Should skip');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('getBufferedLogs', () => {
    it('returns a copy of the buffer', () => {
      console.error('[test] entry');
      const logs1 = getBufferedLogs();
      const logs2 = getBufferedLogs();

      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2);
    });

    it('includes timestamp in ISO format', () => {
      const before = getBufferedLogs().length;
      console.error('[test] timestamp check');
      const entry = getBufferedLogs()[before];

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
