/**
 * Assistant image upload store (user attachments).
 * Postgres when DATABASE_URL set; else in-memory map.
 * Spec: specs/domain/assistant-image-attachments.md
 */

import { randomUUID } from 'node:crypto';
import {
  ASSISTANT_IMAGE_ALLOWED_MIME_TYPES,
  ASSISTANT_IMAGE_DATA_URL_MAX_CHARS,
  ASSISTANT_IMAGE_UPLOAD_MAX_BYTES,
  ASSISTANT_IMAGE_UPLOAD_TTL_SECONDS,
} from '@/lib/constants';
import {
  dbCountActiveAssistantChatImages,
  dbCountRecentAssistantChatImages,
  dbGetAssistantChatImage,
  dbPutAssistantChatImage,
} from '@/lib/db/assistant-chat-images';
import {
  attachmentQuotaWindowStartMs,
  evaluateAttachmentQuota,
} from '@/lib/assistant/attachment-quotas';
import { stripAssistantImageDataUrlMetadata } from '@/lib/assistant/strip-image-metadata';

type StoredImage = {
  userId: string;
  dataUrl: string;
  mimeType: string;
  createdAtMs: number;
  expiresAtMs: number;
};

const store = new Map<string, StoredImage>();

const ALLOWED_MIME = new Set<string>(
  ASSISTANT_IMAGE_ALLOWED_MIME_TYPES.map((m) => (m === 'image/jpg' ? 'image/jpeg' : m)),
);

function ttlMs(): number {
  return ASSISTANT_IMAGE_UPLOAD_TTL_SECONDS * 1000;
}

function purgeExpired(now = Date.now()): void {
  for (const [id, entry] of store) {
    if (entry.expiresAtMs <= now) store.delete(id);
  }
}

export function resetAssistantImageUploadStore(): void {
  store.clear();
}

export function assistantImageUploadStoreSize(): number {
  purgeExpired();
  return store.size;
}

/** Test helper: force-expire a memory entry. */
export function expireAssistantImageForTests(imageId: string): void {
  const entry = store.get(imageId);
  if (!entry) return;
  store.set(imageId, { ...entry, expiresAtMs: Date.now() - 1 });
}

function memoryActiveImageCount(userId: string, now = Date.now()): number {
  let n = 0;
  for (const entry of store.values()) {
    if (entry.userId === userId && entry.expiresAtMs > now) n += 1;
  }
  return n;
}

function memoryRecentImageCount(userId: string, sinceMs: number): number {
  let n = 0;
  for (const entry of store.values()) {
    if (entry.userId === userId && entry.createdAtMs > sinceMs) n += 1;
  }
  return n;
}

async function assertImageQuota(userId: string): Promise<
  | { ok: true }
  | { ok: false; error: string; status: number }
> {
  const sinceMs = attachmentQuotaWindowStartMs();
  let activeCount: number;
  let recentHourCount: number;
  if (process.env.DATABASE_URL) {
    activeCount = await dbCountActiveAssistantChatImages(userId);
    recentHourCount = await dbCountRecentAssistantChatImages(userId, sinceMs);
  } else {
    purgeExpired();
    activeCount = memoryActiveImageCount(userId);
    recentHourCount = memoryRecentImageCount(userId, sinceMs);
  }
  return evaluateAttachmentQuota({ kind: 'image', activeCount, recentHourCount });
}

function approxDecodedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

function mimeFromDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;,]+)/i.exec(dataUrl);
  if (!match?.[1]) return null;
  let mime = match[1].toLowerCase();
  if (mime === 'image/jpg') mime = 'image/jpeg';
  return mime;
}

function isValidBase64Payload(dataUrl: string): boolean {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return false;
  const meta = dataUrl.slice(0, comma).toLowerCase();
  if (!meta.includes(';base64')) return false;
  const b64 = dataUrl.slice(comma + 1).replace(/\s+/g, '');
  if (!b64 || b64.length < 8) return false;
  if (!/^[A-Za-z0-9+/]+=*$/.test(b64)) return false;
  return true;
}

export function isAllowedAssistantImageMime(mime: string): boolean {
  const normalized = mime === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase();
  return ALLOWED_MIME.has(normalized);
}

export type PutAssistantImageResult =
  | { ok: true; imageId: string }
  | { ok: false; error: string; status: number };

export async function putAssistantImage(
  dataUrl: string,
  userId: string,
): Promise<PutAssistantImageResult> {
  purgeExpired();
  const ownerId = userId.trim();
  if (!ownerId) {
    return { ok: false, error: 'userId is required', status: 401 };
  }
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) {
    return { ok: false, error: 'Expected a data:image/… URL', status: 400 };
  }
  if (trimmed.length > ASSISTANT_IMAGE_DATA_URL_MAX_CHARS) {
    return { ok: false, error: 'Image data URL too large', status: 413 };
  }
  if (!isValidBase64Payload(trimmed)) {
    return { ok: false, error: 'Malformed image data URL', status: 400 };
  }
  const mimeType = mimeFromDataUrl(trimmed);
  if (!mimeType || !isAllowedAssistantImageMime(mimeType)) {
    return {
      ok: false,
      error: 'Unsupported image type (use JPEG, PNG, WebP, or GIF)',
      status: 415,
    };
  }
  if (approxDecodedBytes(trimmed) > ASSISTANT_IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, error: 'Image exceeds max upload size', status: 413 };
  }

  const quota = await assertImageQuota(ownerId);
  if (!quota.ok) return quota;

  // Defense-in-depth: drop EXIF/XMP/COM even if client skipped canvas compress.
  const cleaned = stripAssistantImageDataUrlMetadata(trimmed);
  const storeMime = mimeFromDataUrl(cleaned) || mimeType;

  const imageId = randomUUID();
  const now = Date.now();
  const expiresAtMs = now + ttlMs();

  if (process.env.DATABASE_URL) {
    await dbPutAssistantChatImage({
      id: imageId,
      userId: ownerId,
      dataUrl: cleaned,
      mimeType: storeMime,
      expiresAt: new Date(expiresAtMs),
    });
    return { ok: true, imageId };
  }

  store.set(imageId, {
    userId: ownerId,
    dataUrl: cleaned,
    mimeType: storeMime,
    createdAtMs: now,
    expiresAtMs,
  });
  return { ok: true, imageId };
}

export async function getAssistantImageDataUrl(
  imageId: string,
  userId: string,
): Promise<string | null> {
  if (!imageId.trim() || !userId.trim()) return null;
  if (process.env.DATABASE_URL) {
    const row = await dbGetAssistantChatImage(imageId, userId.trim());
    return row?.dataUrl ?? null;
  }
  purgeExpired();
  const entry = store.get(imageId);
  if (!entry) return null;
  if (entry.userId !== userId.trim()) return null;
  if (entry.expiresAtMs <= Date.now()) {
    store.delete(imageId);
    return null;
  }
  return entry.dataUrl;
}

export type AssistantResolvedImage = { id: string; dataUrl: string };

export type ResolveAssistantImagesResult =
  | { ok: true; images: AssistantResolvedImage[] }
  | { ok: false; error: string };

/** Resolve upload IDs in order for this user; fails if any id is missing/expired/foreign. */
export async function resolveAssistantImages(
  imageIds: string[],
  userId: string,
): Promise<ResolveAssistantImagesResult> {
  const images: AssistantResolvedImage[] = [];
  for (const id of imageIds) {
    const dataUrl = await getAssistantImageDataUrl(id, userId);
    if (!dataUrl) {
      return { ok: false, error: `Image not found or expired: ${id}` };
    }
    images.push({ id, dataUrl });
  }
  return { ok: true, images };
}
