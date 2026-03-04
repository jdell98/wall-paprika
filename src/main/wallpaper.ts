import { execFile } from 'node:child_process';
import path from 'node:path';

function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function setWallpaper(imagePath: string): Promise<void> {
  if (!path.isAbsolute(imagePath)) {
    return Promise.reject(new Error('Wallpaper path must be absolute'));
  }

  const escaped = escapeAppleScriptString(imagePath);

  return new Promise((resolve, reject) => {
    const script = `tell application "System Events" to tell every desktop to set picture to "${escaped}"`;
    execFile('osascript', ['-e', script], (error) => {
      if (error) {
        reject(new Error(`Failed to set wallpaper: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}
