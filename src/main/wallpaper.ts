import { execFile } from 'node:child_process';

export function setWallpaper(imagePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = `tell application "System Events" to tell every desktop to set picture to "${imagePath}"`;
    execFile('osascript', ['-e', script], (error) => {
      if (error) {
        reject(new Error(`Failed to set wallpaper: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}
