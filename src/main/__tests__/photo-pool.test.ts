import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PhotoMeta } from '../../shared/types';

// Mock electron modules
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

vi.mock('../unsplash', () => ({
  getCollectionPhotos: vi.fn(),
}));

import { prefetchCollectionPhotos, removeCollectionPhotos, pickRandomPhoto } from '../photo-pool';
import { getCollectionPhotos } from '../unsplash';

const mockGetPhotos = vi.mocked(getCollectionPhotos);

function makePhoto(id: string): PhotoMeta {
  return {
    id,
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
  storeData['prefetchedPhotos'] = [];
  storeData['shownPhotoIds'] = [];
});

// ──────────────────────────────────────────────
// prefetchCollectionPhotos
// ──────────────────────────────────────────────

describe('prefetchCollectionPhotos', () => {
  it('fetches and stores photos for a collection', async () => {
    const photos = [makePhoto('p1'), makePhoto('p2')];
    mockGetPhotos.mockResolvedValueOnce(photos);

    await prefetchCollectionPhotos('col1');

    expect(mockGetPhotos).toHaveBeenCalledWith('col1', 1, 30, 'test-api-key');
    expect(storeData['prefetchedPhotos']).toEqual(photos);
  });

  it('deduplicates photos already in the pool', async () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1')];
    mockGetPhotos.mockResolvedValueOnce([makePhoto('p1'), makePhoto('p2')]);

    await prefetchCollectionPhotos('col1');

    const pool = storeData['prefetchedPhotos'] as PhotoMeta[];
    expect(pool).toHaveLength(2);
    expect(pool.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('does nothing when API returns empty', async () => {
    mockGetPhotos.mockResolvedValueOnce([]);

    await prefetchCollectionPhotos('col1');

    expect(storeData['prefetchedPhotos']).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// removeCollectionPhotos
// ──────────────────────────────────────────────

describe('removeCollectionPhotos', () => {
  it('removes matching photos from prefetched pool', () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1'), makePhoto('p2'), makePhoto('p3')];
    storeData['shownPhotoIds'] = ['p1', 'p2'];

    removeCollectionPhotos('col1', new Set(['p1', 'p3']));

    const pool = storeData['prefetchedPhotos'] as PhotoMeta[];
    expect(pool.map((p) => p.id)).toEqual(['p2']);
  });

  it('removes matching IDs from shown list', () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1'), makePhoto('p2')];
    storeData['shownPhotoIds'] = ['p1', 'p2', 'p3'];

    removeCollectionPhotos('col1', new Set(['p2', 'p3']));

    expect(storeData['shownPhotoIds']).toEqual(['p1']);
  });
});

// ──────────────────────────────────────────────
// pickRandomPhoto
// ──────────────────────────────────────────────

describe('pickRandomPhoto', () => {
  it('returns null when pool is empty', () => {
    expect(pickRandomPhoto()).toBeNull();
  });

  it('picks a photo from the pool', () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1')];

    const photo = pickRandomPhoto();

    expect(photo).not.toBeNull();
    expect(photo!.id).toBe('p1');
  });

  it('skips already-shown photos', () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1'), makePhoto('p2')];
    storeData['shownPhotoIds'] = ['p1'];

    const photo = pickRandomPhoto();

    expect(photo!.id).toBe('p2');
  });

  it('resets shown list when all photos have been shown', () => {
    storeData['prefetchedPhotos'] = [makePhoto('p1'), makePhoto('p2')];
    storeData['shownPhotoIds'] = ['p1', 'p2'];

    const photo = pickRandomPhoto();

    expect(photo).not.toBeNull();
    // After reset, shown list should contain only the newly picked photo
    expect(storeData['shownPhotoIds']).toEqual([photo!.id]);
  });

  it('adds picked photo to shown list', () => {
    storeData['prefetchedPhotos'] = [makePhoto('only')];
    storeData['shownPhotoIds'] = [];

    pickRandomPhoto();

    expect(storeData['shownPhotoIds']).toContain('only');
  });

  it('cycles through all photos before repeating', () => {
    const ids = ['a', 'b', 'c'];
    storeData['prefetchedPhotos'] = ids.map(makePhoto);
    storeData['shownPhotoIds'] = [];

    const picked = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const photo = pickRandomPhoto();
      expect(photo).not.toBeNull();
      expect(picked.has(photo!.id)).toBe(false);
      picked.add(photo!.id);
    }

    expect(picked).toEqual(new Set(ids));
  });
});
