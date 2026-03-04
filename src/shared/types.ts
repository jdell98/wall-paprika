export interface Collection {
  id: string;
  title: string;
  totalPhotos: number;
  coverUrl: string | null;
}

export interface PhotoMeta {
  id: string;
  url: string;
  downloadLocation: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
  description: string | null;
}

export interface RotationInterval {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
}

export interface Settings {
  apiKeyMasked: string | null;
  collections: Collection[];
  rotationInterval: RotationInterval;
  hotkey: string | null;
  launchAtLogin: boolean;
  paused: boolean;
  currentPhoto: PhotoMeta | null;
  setupComplete: boolean;
}

export interface RotationStatus {
  paused: boolean;
  interval: RotationInterval;
  lastRotation: number | null;
}

export interface WallPaprikaAPI {
  getAppVersion: () => Promise<string>;
  getSettings: () => Promise<Settings>;
  setApiKey: (key: string) => Promise<void>;
  validateApiKey: (key: string) => Promise<{ valid: boolean; error?: string }>;
  setSetupComplete: () => Promise<void>;
  getSetupComplete: () => Promise<boolean>;
  addCollection: (url: string) => Promise<{ collection?: Collection; error?: string }>;
  removeCollection: (id: string) => Promise<void>;
  getCollections: () => Promise<Collection[]>;
  getTotalPhotos: () => Promise<number>;
  setRotationInterval: (interval: RotationInterval) => Promise<void>;
  setPaused: (paused: boolean) => Promise<void>;
  getRotationStatus: () => Promise<RotationStatus>;
}

declare global {
  interface Window {
    api: WallPaprikaAPI;
  }
}
