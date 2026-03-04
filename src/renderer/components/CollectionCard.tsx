import { useState } from 'react';
import type { Collection } from '../../shared/types';

export function CollectionCard({
  collection,
  onRemove,
}: {
  collection: Collection;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
      {collection.coverUrl ? (
        <img
          src={collection.coverUrl}
          alt={collection.title}
          className="h-12 w-12 rounded object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
          No img
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{collection.title}</p>
        <p className="text-xs text-gray-500">{collection.totalPhotos} photos</p>
      </div>

      {confirming ? (
        <div className="flex gap-1">
          <button
            onClick={() => {
              onRemove(collection.id);
              setConfirming(false);
            }}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-red-600"
        >
          Remove
        </button>
      )}
    </div>
  );
}
