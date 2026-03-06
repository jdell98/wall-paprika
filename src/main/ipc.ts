import { app, ipcMain } from 'electron';
import { store, getApiKey, setApiKey, getMaskedApiKey } from './store';
import { getBufferedLogs } from './logger';
import {
  validateKey,
  parseCollectionUrl,
  getCollection,
  getRateLimit,
  InvalidKeyError,
  RateLimitError,
} from './unsplash';
import { prefetchCollectionPhotos, removeCollectionPhotos } from './photo-pool';
import { shortcutManager } from './shortcuts';
import { rotateWallpaper } from './rotation';
import { updateTrayMenu } from './index';
import type {
  Collection,
  LogEntry,
  RateLimitInfo,
  RotationInterval,
  RotationStatus,
  Settings,
} from '../shared/types';

export function registerIpcHandlers(): void {
  ipcMain.handle('get-settings', (): Settings => {
    return {
      apiKeyMasked: getMaskedApiKey(),
      collections: store.get('collections'),
      rotationInterval: store.get('rotationInterval'),
      hotkey: store.get('hotkey'),
      launchAtLogin: store.get('launchAtLogin'),
      paused: store.get('paused'),
      currentPhoto: store.get('currentPhoto'),
      setupComplete: store.get('setupComplete'),
    };
  });

  ipcMain.handle('set-api-key', (_event, key: string): void => {
    setApiKey(key);
  });

  ipcMain.handle(
    'validate-api-key',
    async (_event, key: string): Promise<{ valid: boolean; error?: string }> => {
      try {
        const valid = await validateKey(key);
        return { valid };
      } catch (error) {
        if (error instanceof InvalidKeyError) {
          return { valid: false, error: 'Invalid API key' };
        }
        if (error instanceof RateLimitError) {
          return { valid: false, error: 'Rate limit exceeded — try again later' };
        }
        return { valid: false, error: 'Network error — check your connection' };
      }
    },
  );

  ipcMain.handle('set-setup-complete', (): void => {
    store.set('setupComplete', true);
  });

  ipcMain.handle('get-setup-complete', (): boolean => {
    return store.get('setupComplete');
  });

  ipcMain.handle('get-api-key-exists', (): boolean => {
    return getApiKey() !== null;
  });

  ipcMain.handle(
    'add-collection',
    async (_event, url: string): Promise<{ collection?: Collection; error?: string }> => {
      if (typeof url !== 'string' || url.length === 0) {
        return { error: 'Collection URL is required' };
      }
      if (url.length > 500) {
        return { error: 'Input too long' };
      }

      const collectionId = parseCollectionUrl(url);
      if (!collectionId) {
        return { error: 'Invalid Unsplash collection URL' };
      }

      const existing = store.get('collections');
      if (existing.some((c) => c.id === collectionId)) {
        return { error: 'Collection already added' };
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        return { error: 'API key not configured' };
      }

      try {
        const collection = await getCollection(collectionId, apiKey);
        if (!collection) {
          return { error: 'Collection not found' };
        }

        store.set('collections', [...existing, collection]);

        // Prefetch photos in the background
        prefetchCollectionPhotos(collectionId).catch((err) => {
          console.error(`[photo-pool] Failed to prefetch photos for ${collectionId}:`, err);
        });

        return { collection };
      } catch (error) {
        if (error instanceof InvalidKeyError) {
          return { error: 'Invalid API key' };
        }
        if (error instanceof RateLimitError) {
          return { error: 'Rate limit exceeded — try again later' };
        }
        return { error: 'Failed to fetch collection — check your connection' };
      }
    },
  );

  ipcMain.handle('remove-collection', (_event, collectionId: string): void => {
    const collections = store.get('collections');
    store.set(
      'collections',
      collections.filter((c) => c.id !== collectionId),
    );

    removeCollectionPhotos(collectionId);
  });

  ipcMain.handle('get-collections', (): Collection[] => {
    return store.get('collections');
  });

  ipcMain.handle('get-total-photos', (): number => {
    const collections = store.get('collections');
    return collections.reduce((sum, c) => sum + c.totalPhotos, 0);
  });

  ipcMain.handle('set-rotation-interval', (_event, interval: RotationInterval): void => {
    store.set('rotationInterval', interval);
  });

  ipcMain.handle('set-paused', (_event, paused: boolean): void => {
    store.set('paused', paused);
  });

  ipcMain.handle('get-rotation-status', (): RotationStatus => {
    return {
      paused: store.get('paused'),
      interval: store.get('rotationInterval'),
      lastRotation: store.get('lastRotationTimestamp'),
    };
  });

  ipcMain.handle(
    'set-hotkey',
    (_event, accelerator: string): { success: boolean; error?: string } => {
      const success = shortcutManager.update(accelerator);
      if (!success) {
        return { success: false, error: 'Shortcut is already in use by another application' };
      }
      return { success: true };
    },
  );

  ipcMain.handle('clear-hotkey', (): void => {
    shortcutManager.update(null);
  });

  ipcMain.handle('get-hotkey', (): string | null => {
    return store.get('hotkey');
  });

  ipcMain.handle('set-launch-at-login', (_event, enabled: boolean): void => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    store.set('launchAtLogin', enabled);
  });

  ipcMain.handle('get-launch-at-login', (): boolean => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('get-rate-limit', (): RateLimitInfo => {
    return getRateLimit();
  });

  ipcMain.handle(
    'validate-current-key',
    async (): Promise<{ valid: boolean; error?: string }> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        return { valid: false, error: 'No API key configured' };
      }
      try {
        const valid = await validateKey(apiKey);
        return { valid };
      } catch (error) {
        if (error instanceof InvalidKeyError) {
          return { valid: false, error: 'Invalid API key' };
        }
        if (error instanceof RateLimitError) {
          return { valid: false, error: 'Rate limit exceeded — try again later' };
        }
        return { valid: false, error: 'Network error — check your connection' };
      }
    },
  );

  ipcMain.handle('get-logs', (): LogEntry[] => {
    return getBufferedLogs();
  });

  ipcMain.handle('next-wallpaper', async (): Promise<boolean> => {
    const success = await rotateWallpaper();
    if (success) {
      updateTrayMenu();
    }
    return success;
  });
}
