import { app, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { store } from './store';
import { pickRandomPhoto } from './photo-pool';
import type { PhotoMeta } from '../shared/types';

const BATCH_SIZE = 10;

function getBatchDir(): string {
  return path.join(app.getPath('userData'), 'batch');
}

export function ensureBatchDir(): void {
  const dir = getBatchDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function downloadImage(photo: PhotoMeta): Promise<string> {
  const filePath = path.join(getBatchDir(), `${photo.id}.jpg`);

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const response = await net.fetch(photo.url);
  if (!response.ok) {
    throw new Error(`Failed to download image ${photo.id}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export async function fillBatch(): Promise<void> {
  ensureBatchDir();
  const currentCount = getBatchCount();
  const needed = BATCH_SIZE - currentCount;
  if (needed <= 0) return;

  for (let i = 0; i < needed; i++) {
    const photo = pickRandomPhoto();
    if (!photo) break;

    try {
      await downloadImage(photo);
    } catch (error) {
      console.error(`[batch] Failed to download ${photo.id}:`, error);
    }
  }
}

export async function getNextPhoto(): Promise<{ photo: PhotoMeta; filePath: string } | null> {
  ensureBatchDir();
  const dir = getBatchDir();

  let files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'));

  // If batch is empty, try to fill it
  if (files.length === 0) {
    await fillBatch();
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'));
  }

  if (files.length === 0) return null;

  // Pick a random file from the batch
  const file = files[Math.floor(Math.random() * files.length)];
  const photoId = path.basename(file, '.jpg');
  const filePath = path.join(dir, file);

  // Find matching metadata from prefetched pool
  const pool = store.get('prefetchedPhotos');
  const photo = pool.find((p) => p.id === photoId);

  if (!photo) {
    // Metadata missing — skip this file and try again
    deleteImage(filePath);
    if (files.length > 1) {
      return getNextPhoto();
    }
    return null;
  }

  return { photo, filePath };
}

export function deleteImage(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`[batch] Failed to delete ${filePath}:`, error);
  }
}

export function getBatchCount(): number {
  const dir = getBatchDir();
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
}
