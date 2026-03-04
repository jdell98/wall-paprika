import { ipcMain, net } from 'electron';
import { store, getApiKey, setApiKey, getMaskedApiKey } from './store';
import type { Settings } from '../shared/types';

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
        const response = await net.fetch('https://api.unsplash.com/photos/random', {
          headers: {
            Authorization: `Client-ID ${key}`,
          },
        });

        if (response.ok) {
          return { valid: true };
        }

        if (response.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }

        if (response.status === 403) {
          return { valid: false, error: 'API key lacks required permissions' };
        }

        if (response.status === 429) {
          return { valid: false, error: 'Rate limit exceeded — try again later' };
        }

        return { valid: false, error: `Unexpected response (${response.status})` };
      } catch {
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
}
