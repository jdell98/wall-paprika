import { store } from './store';
import { rotateWallpaper } from './rotation';
import { updateTrayMenu } from './index';
import type { RotationInterval } from '../shared/types';

export function intervalToMs(interval: RotationInterval): number {
  const { value, unit } = interval;
  switch (unit) {
    case 'minutes':
      return value * 60_000;
    case 'hours':
      return value * 3_600_000;
    case 'days':
      return value * 86_400_000;
    case 'weeks':
      return value * 604_800_000;
    case 'months':
      return value * 2_592_000_000;
    case 'years':
      return value * 31_536_000_000;
  }
}

class Scheduler {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    this.stop();

    if (store.get('paused')) return;

    const interval = store.get('rotationInterval');
    const ms = intervalToMs(interval);

    this.timer = setInterval(() => {
      this.tick();
    }, ms);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  restart(): void {
    this.start();
  }

  handleResume(): void {
    if (store.get('paused')) return;

    const lastRotation = store.get('lastRotationTimestamp');
    if (!lastRotation) {
      this.start();
      return;
    }

    const interval = store.get('rotationInterval');
    const ms = intervalToMs(interval);
    const elapsed = Date.now() - lastRotation;
    const remaining = ms - elapsed;

    if (remaining <= 0) {
      // Enough time has passed — rotate immediately and restart regular timer
      this.tick();
      this.start();
    } else {
      // Set a one-shot timeout for the remaining time, then switch to regular interval
      this.stop();
      this.timer = setTimeout(() => {
        this.tick();
        this.start();
      }, remaining);
    }
  }

  private tick(): void {
    rotateWallpaper()
      .then((success) => {
        if (success) {
          updateTrayMenu();
        }
      })
      .catch((err) => {
        console.error('[scheduler] Rotation failed:', err);
      });
  }
}

export const scheduler = new Scheduler();
