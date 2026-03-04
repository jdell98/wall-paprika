import Store from 'electron-store';
import { safeStorage } from 'electron';
import type { Collection, PhotoMeta, RotationInterval } from '../shared/types';

interface StoreSchema {
  apiKey: string | null;
  collections: Collection[];
  rotationInterval: RotationInterval;
  hotkey: string | null;
  launchAtLogin: boolean;
  paused: boolean;
  currentPhoto: PhotoMeta | null;
  currentWallpaperPath: string | null;
  lastRotationTimestamp: number | null;
  shownPhotoIds: string[];
  prefetchedPhotos: PhotoMeta[];
  setupComplete: boolean;
}

export const store = new Store<StoreSchema>({
  name: 'config',
  defaults: {
    apiKey: null,
    collections: [],
    rotationInterval: { value: 1, unit: 'hours' },
    hotkey: null,
    launchAtLogin: false,
    paused: false,
    currentPhoto: null,
    currentWallpaperPath: null,
    lastRotationTimestamp: null,
    shownPhotoIds: [],
    prefetchedPhotos: [],
    setupComplete: false,
  },
});

export function getApiKey(): string | null {
  const encrypted = store.get('apiKey');
  if (!encrypted) return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  const encrypted = safeStorage.encryptString(key).toString('base64');
  store.set('apiKey', encrypted);
}

export function getMaskedApiKey(): string | null {
  const key = getApiKey();
  if (!key) return null;
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
