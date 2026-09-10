/**
 * Normalize Complete `documentIds`.
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { ASSISTANT_DOCUMENT_MAX_PER_TURN } from '@/lib/constants';

export function normalizeAssistantDocumentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= ASSISTANT_DOCUMENT_MAX_PER_TURN) break;
  }
  return ids;
}
