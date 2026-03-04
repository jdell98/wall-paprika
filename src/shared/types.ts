export interface WallPaprikaAPI {
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    api: WallPaprikaAPI;
  }
}
