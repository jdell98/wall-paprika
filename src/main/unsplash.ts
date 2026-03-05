import { net } from 'electron';
import type { Collection, PhotoMeta } from '../shared/types';

const BASE_URL = 'https://api.unsplash.com';

export class InvalidKeyError extends Error {
  constructor() {
    super('Invalid API key');
    this.name = 'InvalidKeyError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded — try again later');
    this.name = 'RateLimitError';
  }
}

interface RateLimit {
  remaining: number;
  limit: number;
}

let rateLimit: RateLimit = { remaining: 50, limit: 50 };

function updateRateLimit(response: Response): void {
  const remaining = response.headers.get('X-Ratelimit-Remaining');
  const limit = response.headers.get('X-Ratelimit-Limit');

  if (remaining !== null) {
    rateLimit.remaining = parseInt(remaining, 10);
  }
  if (limit !== null) {
    rateLimit.limit = parseInt(limit, 10);
  }

  if (rateLimit.remaining < 5) {
    console.warn(
      `[unsplash] Rate limit low: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`,
    );
  }
}

function handleErrorStatus(status: number): void {
  if (status === 401) {
    throw new InvalidKeyError();
  }
  if (status === 429) {
    throw new RateLimitError();
  }
}

async function apiFetch(path: string, apiKey: string): Promise<Response> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const response = await net.fetch(url, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  });

  updateRateLimit(response);
  handleErrorStatus(response.status);

  return response;
}

export function parseCollectionUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as a URL with /collections/ path
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?unsplash\.com\/collections\/([A-Za-z0-9_-]+)/,
  );
  if (match) {
    return match[1];
  }

  // If it contains unsplash.com but not /collections/, it's an invalid URL
  if (/unsplash\.com/i.test(trimmed)) {
    return null;
  }

  // Bare ID: alphanumeric, hyphens, underscores only, no spaces or special chars
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function validateKey(key: string): Promise<boolean> {
  try {
    const response = await apiFetch('/photos/random', key);
    return response.ok;
  } catch (error) {
    if (error instanceof InvalidKeyError) {
      return false;
    }
    throw error;
  }
}

export async function getCollection(
  collectionId: string,
  apiKey: string,
): Promise<Collection | null> {
  try {
    const response = await apiFetch(`/collections/${collectionId}`, apiKey);

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.title,
      totalPhotos: data.total_photos,
      coverUrl: data.cover_photo?.urls?.small ?? null,
    };
  } catch (error) {
    if (error instanceof InvalidKeyError || error instanceof RateLimitError) {
      throw error;
    }
    return null;
  }
}

export async function getCollectionPhotos(
  collectionId: string,
  page: number,
  perPage: number,
  apiKey: string,
): Promise<PhotoMeta[]> {
  const response = await apiFetch(
    `/collections/${collectionId}/photos?page=${page}&per_page=${perPage}`,
    apiKey,
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return (data as Record<string, unknown>[]).map(
    (photo: Record<string, unknown>): PhotoMeta => ({
      id: photo.id as string,
      collectionId,
      url: `${(photo.urls as Record<string, string>).raw}?w=3840&q=85`,
      downloadLocation: (photo.links as Record<string, string>).download_location,
      photographerName: (photo.user as Record<string, string>).name,
      photographerUrl: ((photo.user as Record<string, unknown>).links as Record<string, string>)
        .html,
      unsplashUrl: (photo.links as Record<string, string>).html,
      description:
        (photo.description as string) || (photo.alt_description as string) || null,
    }),
  );
}

export async function triggerDownload(downloadLocation: string, apiKey: string): Promise<void> {
  await apiFetch(downloadLocation, apiKey);
}

export function getRateLimit(): RateLimit {
  return { ...rateLimit };
}

// Exported for testing
export function _resetRateLimit(): void {
  rateLimit = { remaining: 50, limit: 50 };
}
