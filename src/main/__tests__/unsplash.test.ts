import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron's net module before importing the client
vi.mock('electron', () => ({
  net: {
    fetch: vi.fn(),
  },
}));

import { net } from 'electron';
import {
  parseCollectionUrl,
  validateKey,
  getCollection,
  getCollectionPhotos,
  triggerDownload,
  getRateLimit,
  InvalidKeyError,
  RateLimitError,
  _resetRateLimit,
} from '../unsplash';

const mockFetch = vi.mocked(net.fetch);

function mockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimit();
});

// ──────────────────────────────────────────────
// parseCollectionUrl
// ──────────────────────────────────────────────

describe('parseCollectionUrl', () => {
  it('parses full URL with slug', () => {
    expect(
      parseCollectionUrl('https://unsplash.com/collections/079sD7qKlrY/spring-wallpapers'),
    ).toBe('079sD7qKlrY');
  });

  it('parses URL without slug', () => {
    expect(parseCollectionUrl('https://unsplash.com/collections/079sD7qKlrY')).toBe(
      '079sD7qKlrY',
    );
  });

  it('parses URL with trailing slash', () => {
    expect(parseCollectionUrl('https://unsplash.com/collections/079sD7qKlrY/')).toBe(
      '079sD7qKlrY',
    );
  });

  it('parses HTTP URL', () => {
    expect(
      parseCollectionUrl('http://unsplash.com/collections/079sD7qKlrY/spring-wallpapers'),
    ).toBe('079sD7qKlrY');
  });

  it('parses URL without protocol', () => {
    expect(parseCollectionUrl('unsplash.com/collections/079sD7qKlrY')).toBe('079sD7qKlrY');
  });

  it('accepts bare collection ID', () => {
    expect(parseCollectionUrl('079sD7qKlrY')).toBe('079sD7qKlrY');
  });

  it('returns null for non-collection Unsplash URL', () => {
    expect(parseCollectionUrl('https://unsplash.com/photos/abc123')).toBeNull();
  });

  it('returns null for random garbage', () => {
    expect(parseCollectionUrl('random garbage')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCollectionUrl('')).toBeNull();
  });

  it('returns null for whitespace', () => {
    expect(parseCollectionUrl('   ')).toBeNull();
  });
});

// ──────────────────────────────────────────────
// validateKey
// ──────────────────────────────────────────────

describe('validateKey', () => {
  it('returns true for a valid key', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200));
    expect(await validateKey('valid-key')).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://api.unsplash.com/photos/random', {
      headers: { Authorization: 'Client-ID valid-key' },
    });
  });

  it('returns false for an invalid key (401)', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401));
    expect(await validateKey('bad-key')).toBe(false);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(429));
    await expect(validateKey('key')).rejects.toThrow(RateLimitError);
  });
});

// ──────────────────────────────────────────────
// getCollection
// ──────────────────────────────────────────────

describe('getCollection', () => {
  it('returns collection metadata on success', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, {
        id: 'abc123',
        title: 'My Collection',
        total_photos: 42,
        cover_photo: { urls: { small: 'https://images.unsplash.com/cover' } },
      }),
    );

    const result = await getCollection('abc123', 'key');
    expect(result).toEqual({
      id: 'abc123',
      title: 'My Collection',
      totalPhotos: 42,
      coverUrl: 'https://images.unsplash.com/cover',
    });
  });

  it('returns null for 404', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(404));
    expect(await getCollection('nonexistent', 'key')).toBeNull();
  });

  it('throws InvalidKeyError on 401', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401));
    await expect(getCollection('abc', 'bad-key')).rejects.toThrow(InvalidKeyError);
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));
    expect(await getCollection('abc', 'key')).toBeNull();
  });
});

// ──────────────────────────────────────────────
// getCollectionPhotos
// ──────────────────────────────────────────────

describe('getCollectionPhotos', () => {
  it('maps photo data to PhotoMeta correctly', async () => {
    const apiPhoto = {
      id: 'photo1',
      urls: { raw: 'https://images.unsplash.com/photo-1' },
      links: {
        download_location: 'https://api.unsplash.com/photos/photo1/download',
        html: 'https://unsplash.com/photos/photo1',
      },
      user: {
        name: 'Jane Doe',
        links: { html: 'https://unsplash.com/@janedoe' },
      },
      description: 'A beautiful sunset',
      alt_description: 'sunset over ocean',
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, [apiPhoto]));

    const photos = await getCollectionPhotos('col1', 1, 10, 'key');
    expect(photos).toHaveLength(1);
    expect(photos[0]).toEqual({
      id: 'photo1',
      url: 'https://images.unsplash.com/photo-1?w=3840&q=85',
      downloadLocation: 'https://api.unsplash.com/photos/photo1/download',
      photographerName: 'Jane Doe',
      photographerUrl: 'https://unsplash.com/@janedoe',
      unsplashUrl: 'https://unsplash.com/photos/photo1',
      description: 'A beautiful sunset',
    });
  });

  it('uses alt_description when description is null', async () => {
    const apiPhoto = {
      id: 'photo2',
      urls: { raw: 'https://images.unsplash.com/photo-2' },
      links: {
        download_location: 'https://api.unsplash.com/photos/photo2/download',
        html: 'https://unsplash.com/photos/photo2',
      },
      user: {
        name: 'John',
        links: { html: 'https://unsplash.com/@john' },
      },
      description: null,
      alt_description: 'alt text',
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, [apiPhoto]));
    const photos = await getCollectionPhotos('col1', 1, 10, 'key');
    expect(photos[0].description).toBe('alt text');
  });

  it('returns null description when both are null', async () => {
    const apiPhoto = {
      id: 'photo3',
      urls: { raw: 'https://images.unsplash.com/photo-3' },
      links: {
        download_location: 'https://api.unsplash.com/photos/photo3/download',
        html: 'https://unsplash.com/photos/photo3',
      },
      user: {
        name: 'Alice',
        links: { html: 'https://unsplash.com/@alice' },
      },
      description: null,
      alt_description: null,
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, [apiPhoto]));
    const photos = await getCollectionPhotos('col1', 1, 10, 'key');
    expect(photos[0].description).toBeNull();
  });

  it('returns empty array on error response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500));
    const photos = await getCollectionPhotos('col1', 1, 10, 'key');
    expect(photos).toEqual([]);
  });

  it('appends 4K params to image URL', async () => {
    const apiPhoto = {
      id: 'p',
      urls: { raw: 'https://images.unsplash.com/photo' },
      links: { download_location: 'dl', html: 'html' },
      user: { name: 'N', links: { html: 'u' } },
      description: null,
      alt_description: null,
    };

    mockFetch.mockResolvedValueOnce(mockResponse(200, [apiPhoto]));
    const photos = await getCollectionPhotos('col1', 1, 10, 'key');
    expect(photos[0].url).toBe('https://images.unsplash.com/photo?w=3840&q=85');
  });
});

// ──────────────────────────────────────────────
// triggerDownload
// ──────────────────────────────────────────────

describe('triggerDownload', () => {
  it('makes GET request to download location', async () => {
    const downloadUrl = 'https://api.unsplash.com/photos/abc/download?ixid=123';
    mockFetch.mockResolvedValueOnce(mockResponse(200));

    await triggerDownload(downloadUrl, 'key');
    expect(mockFetch).toHaveBeenCalledWith(downloadUrl, {
      headers: { Authorization: 'Client-ID key' },
    });
  });
});

// ──────────────────────────────────────────────
// Rate limit tracking
// ──────────────────────────────────────────────

describe('rate limit tracking', () => {
  it('updates rate limit from response headers', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, {}, { 'X-Ratelimit-Remaining': '42', 'X-Ratelimit-Limit': '50' }),
    );

    await validateKey('key');
    const limit = getRateLimit();
    expect(limit.remaining).toBe(42);
    expect(limit.limit).toBe(50);
  });

  it('defaults to 50/50 before any request', () => {
    const limit = getRateLimit();
    expect(limit.remaining).toBe(50);
    expect(limit.limit).toBe(50);
  });

  it('returns a copy, not a reference', () => {
    const a = getRateLimit();
    const b = getRateLimit();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
