import { contextBridge, ipcRenderer } from 'electron';
import type { WallPaprikaAPI } from './shared/types';

const api: WallPaprikaAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setApiKey: (key: string) => ipcRenderer.invoke('set-api-key', key),
  validateApiKey: (key: string) => ipcRenderer.invoke('validate-api-key', key),
  setSetupComplete: () => ipcRenderer.invoke('set-setup-complete'),
  getSetupComplete: () => ipcRenderer.invoke('get-setup-complete'),
  addCollection: (url: string) => ipcRenderer.invoke('add-collection', url),
  removeCollection: (id: string) => ipcRenderer.invoke('remove-collection', id),
  getCollections: () => ipcRenderer.invoke('get-collections'),
  getTotalPhotos: () => ipcRenderer.invoke('get-total-photos'),
};

contextBridge.exposeInMainWorld('api', api);
