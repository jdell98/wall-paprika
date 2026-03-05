import { store, getApiKey } from './store';
import { getCollectionPhotos } from './unsplash';
import type { PhotoMeta } from '../shared/types';

const PHOTOS_PER_PAGE = 30;

export async function prefetchCollectionPhotos(collectionId: string): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const collection = store.get('collections').find((c) => c.id === collectionId);
  const totalPages = collection ? Math.ceil(collection.totalPhotos / PHOTOS_PER_PAGE) : 1;
  const page = Math.floor(Math.random() * totalPages) + 1;

  const photos = await getCollectionPhotos(collectionId, page, PHOTOS_PER_PAGE, apiKey);
  if (photos.length === 0) return;

  const existing = store.get('prefetchedPhotos');
  const existingIds = new Set(existing.map((p) => p.id));
  const newPhotos = photos.filter((p) => !existingIds.has(p.id));

  store.set('prefetchedPhotos', [...existing, ...newPhotos]);
}

export function removeCollectionPhotos(collectionId: string): void {
  const prefetched = store.get('prefetchedPhotos');
  const removedIds = new Set(prefetched.filter((p) => p.collectionId === collectionId).map((p) => p.id));

  store.set(
    'prefetchedPhotos',
    prefetched.filter((p) => p.collectionId !== collectionId),
  );

  const shown = store.get('shownPhotoIds');
  store.set(
    'shownPhotoIds',
    shown.filter((id) => !removedIds.has(id)),
  );
}


export function getPoolSize(): number {
  return store.get('prefetchedPhotos').length;
}

export function pickRandomPhoto(collectionId?: string): PhotoMeta | null {
  const allPool = store.get('prefetchedPhotos');
  const pool = collectionId ? allPool.filter((p) => p.collectionId === collectionId) : allPool;
  if (pool.length === 0) return null;

  const shown = new Set(store.get('shownPhotoIds'));
  const unshown = pool.filter((p) => !shown.has(p.id));

  // If all photos in this subset are shown, pick from the full subset anyway
  if (unshown.length === 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const photo = pool[idx];
    store.set('shownPhotoIds', [...store.get('shownPhotoIds'), photo.id]);
    return photo;
  }

  const idx = Math.floor(Math.random() * unshown.length);
  const photo = unshown[idx];
  store.set('shownPhotoIds', [...store.get('shownPhotoIds'), photo.id]);
  return photo;
}
