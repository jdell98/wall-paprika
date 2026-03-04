import { store, getApiKey } from './store';
import { getCollectionPhotos } from './unsplash';
import type { PhotoMeta } from '../shared/types';

const PHOTOS_PER_PAGE = 30;

export async function prefetchCollectionPhotos(collectionId: string): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  const photos = await getCollectionPhotos(collectionId, 1, PHOTOS_PER_PAGE, apiKey);
  if (photos.length === 0) return;

  const existing = store.get('prefetchedPhotos');
  const existingIds = new Set(existing.map((p) => p.id));
  const newPhotos = photos.filter((p) => !existingIds.has(p.id));

  store.set('prefetchedPhotos', [...existing, ...newPhotos]);
}

export function removeCollectionPhotos(collectionId: string, photoIds: Set<string>): void {
  // Remove prefetched photos belonging to this collection
  const prefetched = store.get('prefetchedPhotos');
  store.set(
    'prefetchedPhotos',
    prefetched.filter((p) => !photoIds.has(p.id)),
  );

  // Remove shown IDs for photos from this collection
  const shown = store.get('shownPhotoIds');
  store.set(
    'shownPhotoIds',
    shown.filter((id) => !photoIds.has(id)),
  );
}

export async function getPhotosForCollection(collectionId: string): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const photos = await getCollectionPhotos(collectionId, 1, PHOTOS_PER_PAGE, apiKey);
  return photos.map((p) => p.id);
}

export function getPoolSize(): number {
  return store.get('prefetchedPhotos').length;
}

export function pickRandomPhoto(): PhotoMeta | null {
  const pool = store.get('prefetchedPhotos');
  if (pool.length === 0) return null;

  const shown = new Set(store.get('shownPhotoIds'));
  const unshown = pool.filter((p) => !shown.has(p.id));

  // If all photos shown, reset
  if (unshown.length === 0) {
    store.set('shownPhotoIds', []);
    const idx = Math.floor(Math.random() * pool.length);
    const photo = pool[idx];
    store.set('shownPhotoIds', [photo.id]);
    return photo;
  }

  const idx = Math.floor(Math.random() * unshown.length);
  const photo = unshown[idx];
  store.set('shownPhotoIds', [...store.get('shownPhotoIds'), photo.id]);
  return photo;
}
