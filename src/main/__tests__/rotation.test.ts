import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PhotoMeta } from '../../shared/types';

// Mock electron
vi.mock('electron', () => ({
  net: { fetch: vi.fn() },
  safeStorage: {
    encryptString: vi.fn(() => Buffer.from('encrypted')),
    decryptString: vi.fn(() => 'test-api-key'),
  },
}));

// In-memory store mock
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

const mockSetWallpaper = vi.fn<(path: string) => Promise<void>>(() => Promise.resolve());
vi.mock('../wallpaper', () => ({
  setWallpaper: (path: string) => mockSetWallpaper(path),
}));

const mockGetNextPhoto = vi.fn();
const mockDeleteImage = vi.fn();
const mockGetBatchCount = vi.fn(() => 10);
const mockFillBatch = vi.fn(() => Promise.resolve());
vi.mock('../batch-manager', () => ({
  getNextPhoto: () => mockGetNextPhoto(),
  deleteImage: (path: string) => mockDeleteImage(path),
  getBatchCount: () => mockGetBatchCount(),
  fillBatch: () => mockFillBatch(),
}));

const mockTriggerDownload = vi.fn<(loc: string, key: string) => Promise<void>>(() =>
  Promise.resolve(),
);
vi.mock('../unsplash', () => ({
  triggerDownload: (loc: string, key: string) => mockTriggerDownload(loc, key),
}));

import { rotateWallpaper } from '../rotation';
import { getApiKey } from '../store';

function makePhoto(id: string): PhotoMeta {
  return {
    id,
    collectionId: 'col1',
    url: `https://images.unsplash.com/${id}?w=3840&q=85`,
    downloadLocation: `https://api.unsplash.com/photos/${id}/download`,
    photographerName: 'Test',
    photographerUrl: 'https://unsplash.com/@test',
    unsplashUrl: `https://unsplash.com/photos/${id}`,
    description: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  storeData['currentPhoto'] = null;
  storeData['currentWallpaperPath'] = null;
  storeData['shownPhotoIds'] = [];
  storeData['prefetchedPhotos'] = [];
  mockSetWallpaper.mockResolvedValue(undefined);
  mockGetBatchCount.mockReturnValue(10);
});

describe('rotateWallpaper', () => {
  it('returns false when no photos are available', async () => {
    mockGetNextPhoto.mockResolvedValueOnce(null);

    const result = await rotateWallpaper();

    expect(result).toBe(false);
    expect(mockSetWallpaper).not.toHaveBeenCalled();
  });

  it('sets wallpaper and updates store on success', async () => {
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    const result = await rotateWallpaper();

    expect(result).toBe(true);
    expect(mockSetWallpaper).toHaveBeenCalledWith('/batch/p1.jpg');
    expect(storeData['currentPhoto']).toEqual(photo);
    expect(storeData['currentWallpaperPath']).toBe('/batch/p1.jpg');
  });

  it('deletes previous wallpaper file when it differs', async () => {
    storeData['currentWallpaperPath'] = '/batch/old.jpg';
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockDeleteImage).toHaveBeenCalledWith('/batch/old.jpg');
  });

  it('does not delete previous file when same as new', async () => {
    storeData['currentWallpaperPath'] = '/batch/p1.jpg';
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('does not delete when no previous wallpaper exists', async () => {
    storeData['currentWallpaperPath'] = null;
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('triggers Unsplash download tracking', async () => {
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockTriggerDownload).toHaveBeenCalledWith(photo.downloadLocation, 'test-api-key');
  });

  it('skips download tracking when no API key', async () => {
    vi.mocked(getApiKey).mockReturnValueOnce(null);
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockTriggerDownload).not.toHaveBeenCalled();
  });

  it('adds photo ID to shown list', async () => {
    storeData['shownPhotoIds'] = ['existing'];
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(storeData['shownPhotoIds']).toEqual(['existing', 'p1']);
  });

  it('does not duplicate photo ID in shown list', async () => {
    storeData['shownPhotoIds'] = ['p1'];
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(storeData['shownPhotoIds']).toEqual(['p1']);
  });

  it('triggers batch refill when count drops to threshold', async () => {
    mockGetBatchCount.mockReturnValue(3);
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockFillBatch).toHaveBeenCalled();
  });

  it('does not trigger refill when batch is above threshold', async () => {
    mockGetBatchCount.mockReturnValue(7);
    const photo = makePhoto('p1');
    mockGetNextPhoto.mockResolvedValueOnce({ photo, filePath: '/batch/p1.jpg' });

    await rotateWallpaper();

    expect(mockFillBatch).not.toHaveBeenCalled();
  });
});
