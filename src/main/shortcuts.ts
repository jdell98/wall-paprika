import { globalShortcut } from 'electron';
import { store } from './store';
import { rotateWallpaper } from './rotation';
import { updateTrayMenu } from './index';

class ShortcutManager {
  private currentHotkey: string | null = null;

  register(): void {
    const hotkey = store.get('hotkey');
    if (!hotkey) return;

    this.registerKey(hotkey);
  }

  unregister(): void {
    if (this.currentHotkey) {
      globalShortcut.unregister(this.currentHotkey);
      this.currentHotkey = null;
    }
  }

  update(newHotkey: string | null): boolean {
    this.unregister();

    if (!newHotkey) {
      store.set('hotkey', null);
      return true;
    }

    const success = this.registerKey(newHotkey);
    if (success) {
      store.set('hotkey', newHotkey);
    }
    return success;
  }

  private registerKey(hotkey: string): boolean {
    try {
      const success = globalShortcut.register(hotkey, () => {
        rotateWallpaper()
          .then((rotated) => {
            if (rotated) {
              store.set('lastRotationTimestamp', Date.now());
              updateTrayMenu();
            }
          })
          .catch((err) => {
            console.error('[shortcuts] Rotation failed:', err);
          });
      });

      if (success) {
        this.currentHotkey = hotkey;
      } else {
        console.warn(`[shortcuts] Failed to register hotkey: ${hotkey}`);
      }

      return success;
    } catch (err) {
      console.error(`[shortcuts] Error registering hotkey ${hotkey}:`, err);
      return false;
    }
  }
}

export const shortcutManager = new ShortcutManager();
