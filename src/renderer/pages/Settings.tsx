import { useEffect, useState } from 'react';
import type { RotationInterval, RotationStatus } from '../../shared/types';
import { HotkeyRecorder } from '../components/HotkeyRecorder';

const units: { value: RotationInterval['unit']; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export default function Settings() {
  const [status, setStatus] = useState<RotationStatus | null>(null);
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<RotationInterval['unit']>('hours');
  const [paused, setPaused] = useState(false);
  const [hotkey, setHotkey] = useState<string | null>(null);

  const loadStatus = async () => {
    const [s, hk] = await Promise.all([
      window.api.getRotationStatus(),
      window.api.getHotkey(),
    ]);
    setStatus(s);
    setIntervalValue(s.interval.value);
    setIntervalUnit(s.interval.unit);
    setPaused(s.paused);
    setHotkey(hk);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleIntervalChange = async (value: number, unit: RotationInterval['unit']) => {
    const clamped = Math.max(1, value);
    setIntervalValue(clamped);
    setIntervalUnit(unit);
    await window.api.setRotationInterval({ value: clamped, unit });
  };

  const handlePauseToggle = async () => {
    const newPaused = !paused;
    setPaused(newPaused);
    await window.api.setPaused(newPaused);
  };

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Rotation Interval */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">Rotation interval</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={intervalValue}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10) || 1, intervalUnit)}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
          <select
            value={intervalUnit}
            onChange={(e) =>
              handleIntervalChange(intervalValue, e.target.value as RotationInterval['unit'])
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            {units.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pause Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Pause rotation</p>
          <p className="text-xs text-gray-500">
            {paused ? 'Rotation paused' : 'Wallpaper rotates automatically'}
          </p>
        </div>
        <button
          onClick={handlePauseToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            paused ? 'bg-gray-300' : 'bg-orange-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              paused ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>

      {/* Keyboard Shortcut */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900">Keyboard shortcut</label>
        <p className="mb-2 text-xs text-gray-500">
          Press a key combination to quickly change your wallpaper from anywhere.
        </p>
        <HotkeyRecorder value={hotkey} onChange={setHotkey} />
      </div>

      {/* Status */}
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
        <p className="mt-1 text-sm text-gray-700">
          {status.lastRotation
            ? `Last changed: ${formatRelativeTime(status.lastRotation)}`
            : 'No wallpaper set yet'}
        </p>
        {paused && <p className="mt-1 text-sm text-orange-600">Rotation is paused</p>}
      </div>
    </div>
  );
}
