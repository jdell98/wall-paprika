import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', () => ({
  net: { fetch: vi.fn() },
  safeStorage: {
    encryptString: vi.fn(() => Buffer.from('encrypted')),
    decryptString: vi.fn(() => 'test-api-key'),
  },
}));

const storeData: Record<string, unknown> = {};

vi.mock('../store', () => ({
  store: {
    get: vi.fn((key: string) => storeData[key]),
    set: vi.fn((key: string, value: unknown) => {
      storeData[key] = value;
    }),
  },
  getApiKey: vi.fn(() => 'test-api-key'),
}));

const mockRotateWallpaper = vi.fn(() => Promise.resolve(true));
vi.mock('../rotation', () => ({
  rotateWallpaper: () => mockRotateWallpaper(),
}));

vi.mock('../index', () => ({
  updateTrayMenu: vi.fn(),
}));

import { intervalToMs, scheduler } from '../scheduler';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  storeData['paused'] = false;
  storeData['rotationInterval'] = { value: 1, unit: 'hours' };
  storeData['lastRotationTimestamp'] = null;
  scheduler.stop();
});

afterEach(() => {
  scheduler.stop();
  vi.useRealTimers();
});

// ──────────────────────────────────────────────
// intervalToMs
// ──────────────────────────────────────────────

describe('intervalToMs', () => {
  it('converts minutes', () => {
    expect(intervalToMs({ value: 5, unit: 'minutes' })).toBe(300_000);
  });

  it('converts hours', () => {
    expect(intervalToMs({ value: 2, unit: 'hours' })).toBe(7_200_000);
  });

  it('converts days', () => {
    expect(intervalToMs({ value: 1, unit: 'days' })).toBe(86_400_000);
  });

  it('converts weeks', () => {
    expect(intervalToMs({ value: 1, unit: 'weeks' })).toBe(604_800_000);
  });

  it('converts months (30 days)', () => {
    expect(intervalToMs({ value: 1, unit: 'months' })).toBe(2_592_000_000);
  });

  it('converts years (365 days)', () => {
    expect(intervalToMs({ value: 1, unit: 'years' })).toBe(31_536_000_000);
  });
});

// ──────────────────────────────────────────────
// Scheduler
// ──────────────────────────────────────────────

describe('scheduler', () => {
  it('does not start when paused', () => {
    storeData['paused'] = true;
    scheduler.start();
    vi.advanceTimersByTime(3_600_000);
    expect(mockRotateWallpaper).not.toHaveBeenCalled();
  });

  it('calls rotateWallpaper on each interval tick', async () => {
    storeData['rotationInterval'] = { value: 30, unit: 'minutes' };
    scheduler.start();

    vi.advanceTimersByTime(30 * 60_000);
    await Promise.resolve();
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30 * 60_000);
    await Promise.resolve();
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(2);
  });

  it('stop prevents further ticks', async () => {
    storeData['rotationInterval'] = { value: 1, unit: 'minutes' };
    scheduler.start();

    vi.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);

    scheduler.stop();
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);
  });

  it('handleResume starts regular timer when no last rotation', () => {
    storeData['lastRotationTimestamp'] = null;
    scheduler.handleResume();

    // Should behave like start() — tick after full interval
    vi.advanceTimersByTime(3_600_000);
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);
  });

  it('handleResume rotates immediately when enough time has passed', async () => {
    storeData['rotationInterval'] = { value: 1, unit: 'hours' };
    storeData['lastRotationTimestamp'] = Date.now() - 2 * 3_600_000; // 2 hours ago

    scheduler.handleResume();
    await Promise.resolve();

    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);
  });

  it('handleResume waits remaining time when interval not yet elapsed', async () => {
    storeData['rotationInterval'] = { value: 1, unit: 'hours' };
    storeData['lastRotationTimestamp'] = Date.now() - 40 * 60_000; // 40 min ago, 20 min remaining

    scheduler.handleResume();
    await Promise.resolve();
    expect(mockRotateWallpaper).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20 * 60_000);
    await Promise.resolve();
    expect(mockRotateWallpaper).toHaveBeenCalledTimes(1);
  });

  it('handleResume does nothing when paused', () => {
    storeData['paused'] = true;
    storeData['lastRotationTimestamp'] = Date.now() - 2 * 3_600_000;

    scheduler.handleResume();
    vi.advanceTimersByTime(3_600_000);
    expect(mockRotateWallpaper).not.toHaveBeenCalled();
  });
});
