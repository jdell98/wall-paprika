import { useState } from 'react';

export default function Controls() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleNext = async () => {
    setLoading(true);
    setMessage(null);
    const success = await window.api.nextWallpaper();
    setMessage(success ? 'Wallpaper changed!' : 'No photos available — add a collection first');
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <button
          onClick={handleNext}
          disabled={loading}
          className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Changing...' : 'Next Wallpaper'}
        </button>
        <p className="mt-1 text-xs text-gray-500">Skip to the next wallpaper immediately</p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-2 text-xs ${
            message.includes('No photos')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
