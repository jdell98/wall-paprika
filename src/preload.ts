import { contextBridge, ipcRenderer } from 'electron';
import type { WallPaprikaAPI } from './shared/types';

const api: WallPaprikaAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

contextBridge.exposeInMainWorld('api', api);
