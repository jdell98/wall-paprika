import { useEffect, useState } from 'react';
import type { Collection } from '../../shared/types';
import { CollectionCard } from '../components/CollectionCard';

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCollections = async () => {
    const [cols, total] = await Promise.all([
      window.api.getCollections(),
      window.api.getTotalPhotos(),
    ]);
    setCollections(cols);
    setTotalPhotos(total);
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const isValidUrl = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    return /unsplash\.com\/collections\/[A-Za-z0-9_-]+/.test(trimmed) ||
      /^[A-Za-z0-9_-]+$/.test(trimmed);
  };

  const handleAdd = async () => {
    setError(null);
    setSuccess(null);

    if (!isValidUrl(url)) {
      setError('Please enter a valid Unsplash collection URL');
      return;
    }

    setLoading(true);
    const result = await window.api.addCollection(url.trim());

    if (result.error) {
      setError(result.error);
    } else if (result.collection) {
      setSuccess(`Added "${result.collection.title}"`);
      setUrl('');
      await loadCollections();
    }

    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    await window.api.removeCollection(id);
    await loadCollections();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAdd();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Add Collection */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste Unsplash collection URL..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !url.trim()}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>

          {error && (
            <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>
          )}

          {success && (
            <div className="mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-700">{success}</div>
          )}
        </div>

        {/* Collections List */}
        {collections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No collections yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Paste an Unsplash collection URL above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {collections.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          {collections.length} collection{collections.length !== 1 ? 's' : ''} &middot;{' '}
          {totalPhotos} total photos
        </div>
      )}
    </div>
  );
}
