/**
 * Per-user attachment quota checks.
 * Spec: specs/domain/assistant-image-attachments.md · assistant-document-attachments.md
 */

import {
  ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER,
  ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR,
  ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER,
  ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR,
} from '@/lib/constants';

const HOUR_MS = 60 * 60 * 1000;

export type AttachmentQuotaKind = 'image' | 'document';

export type AttachmentQuotaOk = { ok: true };
export type AttachmentQuotaDenied = { ok: false; error: string; status: 429 };
export type AttachmentQuotaResult = AttachmentQuotaOk | AttachmentQuotaDenied;

export function attachmentQuotaWindowStartMs(now = Date.now()): number {
  return now - HOUR_MS;
}

export function evaluateAttachmentQuota(input: {
  kind: AttachmentQuotaKind;
  activeCount: number;
  recentHourCount: number;
}): AttachmentQuotaResult {
  const maxActive =
    input.kind === 'image'
      ? ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER
      : ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER;
  const maxHour =
    input.kind === 'image'
      ? ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR
      : ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR;

  if (input.activeCount >= maxActive) {
    return {
      ok: false,
      status: 429,
      error:
        input.kind === 'image'
          ? `Image attachment quota exceeded (max ${maxActive} active)`
          : `Document attachment quota exceeded (max ${maxActive} active)`,
    };
  }
  if (input.recentHourCount >= maxHour) {
    return {
      ok: false,
      status: 429,
      error:
        input.kind === 'image'
          ? `Image upload rate limit exceeded (max ${maxHour}/hour)`
          : `Document upload rate limit exceeded (max ${maxHour}/hour)`,
    };
  }
  return { ok: true };
}
