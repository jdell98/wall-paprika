import { useEffect, useState, useCallback } from 'react';

// Map KeyboardEvent.key to Electron accelerator parts
function keyToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = [];

  if (e.metaKey) parts.push('CommandOrControl');
  if (e.ctrlKey && !e.metaKey) parts.push('CommandOrControl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // Ignore bare modifier keys
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return null;

  // Require at least one modifier
  if (parts.length === 0) return null;

  // Map special keys
  const keyMap: Record<string, string> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ' ': 'Space',
    Escape: 'Escape',
    Enter: 'Return',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
  };

  const key = keyMap[e.key] || e.key.toUpperCase();
  parts.push(key);

  return parts.join('+');
}

// Convert Electron accelerator to human-readable macOS format
function formatAccelerator(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, '\u2318')
    .replace(/Shift/g, '\u21E7')
    .replace(/Alt/g, '\u2325')
    .replace(/\+/g, ' + ');
}

export function HotkeyRecorder({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (hotkey: string | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return;
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === 'Escape') {
        setRecording(false);
        setPending(null);
        return;
      }

      const accelerator = keyToAccelerator(e);
      if (!accelerator) return;

      setPending(accelerator);
      setRecording(false);
    },
    [recording],
  );

  useEffect(() => {
    if (recording) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [recording, handleKeyDown]);

  const handleSave = async () => {
    if (!pending) return;
    setError(null);
    const result = await window.api.setHotkey(pending);
    if (result.success) {
      onChange(pending);
      setPending(null);
    } else {
      setError(result.error ?? 'Failed to register shortcut');
    }
  };

  const handleClear = async () => {
    await window.api.clearHotkey();
    onChange(null);
    setPending(null);
    setError(null);
  };

  const displayValue = pending ?? value;

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setRecording(true);
            setPending(null);
            setError(null);
          }}
          className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${
            recording
              ? 'border-orange-500 bg-orange-50 text-orange-600 animate-pulse'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          {recording
            ? 'Press keys...'
            : displayValue
              ? formatAccelerator(displayValue)
              : 'Click to record shortcut'}
        </button>

        {pending && (
          <button
            onClick={handleSave}
            className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Save
          </button>
        )}

        {(value || pending) && (
          <button
            onClick={handleClear}
            className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
