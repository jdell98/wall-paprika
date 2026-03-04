import { useEffect, useState } from 'react';
import type { RateLimitInfo } from '../../shared/types';

export default function ApiKey() {
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const [settings, rl] = await Promise.all([
      window.api.getSettings(),
      window.api.getRateLimit(),
    ]);
    setMaskedKey(settings.apiKeyMasked);
    setRateLimit(rl);
  };

  useEffect(() => {
    load();
  }, []);

  const handleValidate = async () => {
    setValidating(true);
    setMessage(null);
    const result = await window.api.validateCurrentKey();
    if (result.valid) {
      setMessage({ type: 'success', text: 'API key is valid' });
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Validation failed' });
    }
    // Refresh rate limit after validation call
    const rl = await window.api.getRateLimit();
    setRateLimit(rl);
    setValidating(false);
  };

  const handleUpdate = async () => {
    if (!newKey.trim()) return;
    setValidating(true);
    setMessage(null);

    const result = await window.api.validateApiKey(newKey.trim());
    if (result.valid) {
      await window.api.setApiKey(newKey.trim());
      setMessage({ type: 'success', text: 'API key updated successfully' });
      setEditing(false);
      setNewKey('');
      await load();
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Invalid key' });
    }
    setValidating(false);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Current Key */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900">Current API key</label>
        <p className="mb-3 font-mono text-sm text-gray-600">
          {maskedKey ?? 'No key configured'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={validating || !maskedKey}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <button
            onClick={() => {
              setEditing(!editing);
              setMessage(null);
              setNewKey('');
            }}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            {editing ? 'Cancel' : 'Update Key'}
          </button>
        </div>
      </div>

      {/* Update Key Input */}
      {editing && (
        <div>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Paste new Access Key"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
          <button
            onClick={handleUpdate}
            disabled={!newKey.trim() || validating}
            className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? 'Validating...' : 'Save New Key'}
          </button>
        </div>
      )}

      {/* Feedback */}
      {message && (
        <div
          className={`rounded-lg p-2 text-xs ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Rate Limit */}
      {rateLimit && (
        <div
          className={`rounded-lg p-3 ${
            rateLimit.remaining === 0
              ? 'bg-red-50'
              : rateLimit.remaining <= 10
                ? 'bg-amber-50'
                : 'bg-gray-50'
          }`}
        >
          <p
            className={`text-xs font-medium uppercase ${
              rateLimit.remaining === 0
                ? 'text-red-500'
                : rateLimit.remaining <= 10
                  ? 'text-amber-500'
                  : 'text-gray-500'
            }`}
          >
            API usage
          </p>
          <p
            className={`mt-1 text-sm ${
              rateLimit.remaining === 0
                ? 'text-red-700'
                : rateLimit.remaining <= 10
                  ? 'text-amber-700'
                  : 'text-gray-700'
            }`}
          >
            {rateLimit.remaining} / {rateLimit.limit} requests remaining this hour
          </p>
          {rateLimit.remaining === 0 && (
            <p className="mt-1 text-xs text-red-600">
              Rate limit exceeded. Requests will resume next hour.
            </p>
          )}
          {rateLimit.remaining > 0 && rateLimit.remaining <= 10 && (
            <p className="mt-1 text-xs text-amber-600">
              Running low on API requests. Consider reducing rotation frequency.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
