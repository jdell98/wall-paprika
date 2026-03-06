import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../shared/types';

export default function Logs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    window.api.getLogs().then(setEntries);

    window.api.onLogEntry((entry) => {
      setEntries((prev) => [...prev, entry]);
    });

    return () => {
      window.api.removeLogListener();
    };
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
  }

  async function handleCopy() {
    const text = entries
      .map((e) => `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <span className="text-xs text-gray-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setEntries([])}
            disabled={entries.length === 0}
            className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            disabled={entries.length === 0}
            className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? 'Copied!' : 'Copy All'}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs"
      >
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-gray-400">No logs yet</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-gray-400">{formatTime(entry.timestamp)}</span>
                <span
                  className={`shrink-0 rounded px-1 ${
                    entry.level === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {entry.level === 'error' ? 'ERR' : 'WARN'}
                </span>
                <span className="shrink-0 text-gray-500">[{entry.source}]</span>
                <span className="break-all text-gray-800">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
