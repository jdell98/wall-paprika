import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Collection, PhotoMeta } from '../../shared/types';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-wall-paprika'),
  },
  net: {
    fetch: vi.fn(),
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
}));

// Track pickRandomPhoto calls to verify round-robin behavior
const pickRandomPhotoCalls: (string | undefined)[] = [];
const mockPickRandomPhoto = vi.fn((collectionId?: string) => {
  pickRandomPhotoCalls.push(collectionId);
  const pool = (storeData['prefetchedPhotos'] as PhotoMeta[]) || [];
  const filtered = collectionId ? pool.filter((p) => p.collectionId === collectionId) : pool;
  if (filtered.length === 0) return null;
  return filtered[0];
});

vi.mock('../photo-pool', () => ({
  pickRandomPhoto: (collectionId?: string) => mockPickRandomPhoto(collectionId),
}));

// Mock fs to avoid real file system operations
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn((p: string) => {
      if (p === '/tmp/test-wall-paprika/batch') return true;
      // Pretend images don't already exist so downloadImage proceeds
      return false;
    }),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

// Mock net.fetch for downloadImage
import { net } from 'electron';
const mockFetch = vi.mocked(net.fetch);

import { fillBatch } from '../batch-manager';

function makeCollection(id: string, totalPhotos = 100): Collection {
  return { id, title: `Collection ${id}`, totalPhotos, coverUrl: null };
}

function makePhoto(id: string, collectionId: string): PhotoMeta {
  return {
    id,
    collectionId,
    url: `https://images.unsplash.com/${id}?w=3840&q=85`,
    downloadLocation: `https://api.unsplash.com/photos/${id}/download`,
    photographerName: 'Test',
    photographerUrl: 'https://unsplash.com/@test',
    unsplashUrl: `https://unsplash.com/photos/${id}`,
    description: null,
  };
}

function mockSuccessfulDownload(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response);
}

beforeEach(() => {
  vi.clearAllMocks();
  pickRandomPhotoCalls.length = 0;
  storeData['collections'] = [];
  storeData['prefetchedPhotos'] = [];
  storeData['shownPhotoIds'] = [];
});

describe('fillBatch', () => {
  it('round-robins across collections when filling batch', async () => {
    storeData['collections'] = [makeCollection('col1'), makeCollection('col2'), makeCollection('col3')];
    storeData['prefetchedPhotos'] = [
      makePhoto('a1', 'col1'),
      makePhoto('b1', 'col2'),
      makePhoto('c1', 'col3'),
    ];
    mockSuccessfulDownload();

    await fillBatch();

    // 10 photos needed, round-robin across 3 collections:
    // col1, col2, col3, col1, col2, col3, col1, col2, col3, col1
    const expectedOrder = ['col1', 'col2', 'col3', 'col1', 'col2', 'col3', 'col1', 'col2', 'col3', 'col1'];
    expect(pickRandomPhotoCalls).toEqual(expectedOrder);
  });

  it('distributes evenly between two collections', async () => {
    storeData['collections'] = [makeCollection('col1'), makeCollection('col2')];
    storeData['prefetchedPhotos'] = [
      makePhoto('a1', 'col1'),
      makePhoto('b1', 'col2'),
    ];
    mockSuccessfulDownload();

    await fillBatch();

    // 10 photos: col1, col2, col1, col2, ...
    const col1Count = pickRandomPhotoCalls.filter((c) => c === 'col1').length;
    const col2Count = pickRandomPhotoCalls.filter((c) => c === 'col2').length;
    expect(col1Count).toBe(5);
    expect(col2Count).toBe(5);
  });

  it('works with a single collection', async () => {
    storeData['collections'] = [makeCollection('col1')];
    storeData['prefetchedPhotos'] = [makePhoto('a1', 'col1')];
    mockSuccessfulDownload();

    await fillBatch();

    expect(pickRandomPhotoCalls.every((c) => c === 'col1')).toBe(true);
    expect(pickRandomPhotoCalls).toHaveLength(10);
  });

  it('returns empty result when no collections exist', async () => {
    storeData['collections'] = [];

    const result = await fillBatch();

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(pickRandomPhotoCalls).toHaveLength(0);
  });

  it('skips when pickRandomPhoto returns null for a collection', async () => {
    storeData['collections'] = [makeCollection('col1'), makeCollection('col2')];
    // Only col1 has photos in the pool
    storeData['prefetchedPhotos'] = [makePhoto('a1', 'col1')];
    mockSuccessfulDownload();

    await fillBatch();

    // col2 picks return null and are skipped (not counted as attempted)
    expect(pickRandomPhotoCalls).toHaveLength(10);
    // Only col1 picks result in actual downloads
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });
});
