import { contextBridge, ipcRenderer } from 'electron';
import type { LogEntry, WallPaprikaAPI } from './shared/types';

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
  setRotationInterval: (interval) => ipcRenderer.invoke('set-rotation-interval', interval),
  setPaused: (paused) => ipcRenderer.invoke('set-paused', paused),
  getRotationStatus: () => ipcRenderer.invoke('get-rotation-status'),
  setHotkey: (accelerator) => ipcRenderer.invoke('set-hotkey', accelerator),
  clearHotkey: () => ipcRenderer.invoke('clear-hotkey'),
  getHotkey: () => ipcRenderer.invoke('get-hotkey'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('set-launch-at-login', enabled),
  getLaunchAtLogin: () => ipcRenderer.invoke('get-launch-at-login'),
  getRateLimit: () => ipcRenderer.invoke('get-rate-limit'),
  validateCurrentKey: () => ipcRenderer.invoke('validate-current-key'),
  nextWallpaper: () => ipcRenderer.invoke('next-wallpaper'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  onLogEntry: (callback: (entry: LogEntry) => void) => {
    ipcRenderer.on('log-entry', (_event, entry: LogEntry) => callback(entry));
  },
  removeLogListener: () => {
    ipcRenderer.removeAllListeners('log-entry');
  },
};

contextBridge.exposeInMainWorld('api', api);
