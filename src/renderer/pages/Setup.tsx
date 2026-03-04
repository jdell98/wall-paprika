import { useState } from 'react';

type Step = 'welcome' | 'api-key' | 'complete';

export default function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    setValidated(false);

    const result = await window.api.validateApiKey(apiKey.trim());

    if (result.valid) {
      await window.api.setApiKey(apiKey.trim());
      setValidated(true);
    } else {
      setError(result.error ?? 'Validation failed');
    }

    setValidating(false);
  };

  const handleFinish = async () => {
    await window.api.setSetupComplete();
    onComplete();
  };

  if (step === 'welcome') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Welcome to Wall Paprika</h1>
        <p className="mb-8 max-w-md text-gray-600">
          A menu bar app that automatically rotates your desktop wallpaper using beautiful photos
          from Unsplash collections.
        </p>
        <button
          onClick={() => setStep('api-key')}
          className="rounded-lg bg-orange-600 px-6 py-2 font-medium text-white hover:bg-orange-700"
        >
          Get Started
        </button>
      </div>
    );
  }

  if (step === 'api-key') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Unsplash API Key</h2>
        <p className="mb-6 max-w-md text-center text-sm text-gray-600">
          Wall Paprika needs an Unsplash API key to fetch photos. Create a free account at{' '}
          <button
            onClick={() => window.open('https://unsplash.com/developers', '_blank')}
            className="text-orange-600 underline hover:text-orange-700"
          >
            unsplash.com/developers
          </button>
          , create a New Application, and copy your Access Key.
        </p>

        <div className="w-full max-w-md">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setValidated(false);
              setError(null);
            }}
            placeholder="Paste your Access Key here"
            className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />

          <button
            onClick={handleValidate}
            disabled={!apiKey.trim() || validating}
            className="mb-4 w-full rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>

          {validated && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <span>&#10003;</span>
              <span>API key is valid!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={() => setStep('complete')}
            disabled={!validated}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-gray-900">You&apos;re all set!</h2>
      <p className="mb-8 max-w-md text-gray-600">
        Setup is complete. You can add Unsplash collections from Preferences at any time via the
        menu bar icon.
      </p>
      <button
        onClick={handleFinish}
        className="rounded-lg bg-orange-600 px-6 py-2 font-medium text-white hover:bg-orange-700"
      >
        Finish
      </button>
    </div>
  );
}
