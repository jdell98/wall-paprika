import { store, getApiKey } from './store';
import { triggerDownload } from './unsplash';
import { setWallpaper } from './wallpaper';
import { getNextPhoto, deleteImage, getBatchCount, fillBatch } from './batch-manager';

const REFILL_THRESHOLD = 3;

export async function rotateWallpaper(): Promise<boolean> {
  const previousFile = store.get('currentWallpaperPath');

  const next = await getNextPhoto();
  if (!next) {
    console.warn('[rotation] No photos available');
    return false;
  }

  await setWallpaper(next.filePath);

  // Delete the previous wallpaper file
  if (previousFile && previousFile !== next.filePath) {
    deleteImage(previousFile);
  }

  // Trigger Unsplash download tracking
  const apiKey = getApiKey();
  if (apiKey) {
    triggerDownload(next.photo.downloadLocation, apiKey).catch((err) => {
      console.error('[rotation] Failed to trigger download tracking:', err);
    });
  }

  // Update store
  store.set('currentPhoto', next.photo);
  store.set('currentWallpaperPath', next.filePath);

  // Mark as shown
  const shown = store.get('shownPhotoIds');
  if (!shown.includes(next.photo.id)) {
    store.set('shownPhotoIds', [...shown, next.photo.id]);
  }

  // Check if batch needs refill
  if (getBatchCount() <= REFILL_THRESHOLD) {
    fillBatch().catch((err) => {
      console.error('[rotation] Background batch refill failed:', err);
    });
  }

  return true;
}
