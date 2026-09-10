/**
 * Assistant document upload store (DOCX/PDF/PPTX/MD/TXT).
 * Postgres when DATABASE_URL set; else in-memory map.
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { randomUUID } from 'node:crypto';
import {
  ASSISTANT_DOCUMENT_UPLOAD_MAX_BYTES,
  ASSISTANT_DOCUMENT_UPLOAD_MAX_CHARS,
  ASSISTANT_DOCUMENT_UPLOAD_TTL_SECONDS,
} from '@/lib/constants';
import {
  dbCountActiveAssistantChatDocuments,
  dbCountRecentAssistantChatDocuments,
  dbGetAssistantChatDocument,
  dbPutAssistantChatDocument,
} from '@/lib/db/assistant-chat-documents';
import {
  attachmentQuotaWindowStartMs,
  evaluateAttachmentQuota,
} from '@/lib/assistant/attachment-quotas';
import { extractDocxText } from '@/lib/assistant/extract-docx';
import { extractPdfText } from '@/lib/assistant/extract-pdf';
import { extractPptxText } from '@/lib/assistant/extract-pptx';
import { extractMarkdownText, extractPlainText } from '@/lib/assistant/extract-plain';
import {
  extensionOfAssistantDocument,
  type AssistantDocumentExt,
} from '@/lib/assistant/document-formats';
import { sanitizeAssistantAttachmentFilename } from '@/lib/assistant/sanitize-attachment-filename';

export type { AssistantDocumentExt } from '@/lib/assistant/document-formats';
export {
  extensionOfAssistantDocument,
  isAssistantDocumentFilename,
} from '@/lib/assistant/document-formats';

export type StoredAssistantDocument = {
  userId: string;
  filename: string;
  extractedText: string;
  charCount: number;
  truncated: boolean;
  createdAtMs: number;
  expiresAtMs: number;
};

const store = new Map<string, StoredAssistantDocument>();

function ttlMs(): number {
  return ASSISTANT_DOCUMENT_UPLOAD_TTL_SECONDS * 1000;
}

function purgeExpired(now = Date.now()): void {
  for (const [id, entry] of store) {
    if (entry.expiresAtMs <= now) store.delete(id);
  }
}

export function resetAssistantDocumentUploadStore(): void {
  store.clear();
}

/** Test helper: force-expire a memory entry. */
export function expireAssistantDocumentForTests(documentId: string): void {
  const entry = store.get(documentId);
  if (!entry) return;
  store.set(documentId, { ...entry, expiresAtMs: Date.now() - 1 });
}

function memoryActiveDocumentCount(userId: string, now = Date.now()): number {
  let n = 0;
  for (const entry of store.values()) {
    if (entry.userId === userId && entry.expiresAtMs > now) n += 1;
  }
  return n;
}

function memoryRecentDocumentCount(userId: string, sinceMs: number): number {
  let n = 0;
  for (const entry of store.values()) {
    if (entry.userId === userId && entry.createdAtMs > sinceMs) n += 1;
  }
  return n;
}

async function assertDocumentQuota(userId: string): Promise<
  | { ok: true }
  | { ok: false; error: string; status: number }
> {
  const sinceMs = attachmentQuotaWindowStartMs();
  let activeCount: number;
  let recentHourCount: number;
  if (process.env.DATABASE_URL) {
    activeCount = await dbCountActiveAssistantChatDocuments(userId);
    recentHourCount = await dbCountRecentAssistantChatDocuments(userId, sinceMs);
  } else {
    purgeExpired();
    activeCount = memoryActiveDocumentCount(userId);
    recentHourCount = memoryRecentDocumentCount(userId, sinceMs);
  }
  return evaluateAttachmentQuota({
    kind: 'document',
    activeCount,
    recentHourCount,
  });
}

async function extractByExt(
  ext: AssistantDocumentExt,
  buffer: Buffer,
): Promise<{ text: string; truncated: boolean; usedOcr?: boolean }> {
  const max = ASSISTANT_DOCUMENT_UPLOAD_MAX_CHARS;
  switch (ext) {
    case '.docx':
      return extractDocxText(buffer, max);
    case '.pdf':
      return extractPdfText(buffer, max);
    case '.pptx':
      return extractPptxText(buffer, max);
    case '.md':
    case '.markdown':
      return extractMarkdownText(buffer, max);
    case '.txt':
      return extractPlainText(buffer, max);
    default: {
      const _exhaustive: never = ext;
      return _exhaustive;
    }
  }
}

export type PutAssistantDocumentResult =
  | {
      ok: true;
      documentId: string;
      filename: string;
      charCount: number;
      truncated: boolean;
      usedOcr?: boolean;
    }
  | { ok: false; error: string; status: number };

export async function putAssistantDocument(input: {
  userId: string;
  filename: string;
  buffer: Buffer;
}): Promise<PutAssistantDocumentResult> {
  purgeExpired();
  const ownerId = input.userId.trim();
  if (!ownerId) {
    return { ok: false, error: 'userId is required', status: 401 };
  }
  if (!input.buffer?.byteLength) {
    return { ok: false, error: 'Empty file', status: 400 };
  }
  const filename = sanitizeAssistantAttachmentFilename(
    input.filename.trim() || 'document.docx',
    'document.docx',
  );
  const ext = extensionOfAssistantDocument(filename);
  if (!ext) {
    return {
      ok: false,
      error: 'Only .docx, .pdf, .pptx, .md, .markdown, .txt files are supported',
      status: 415,
    };
  }
  if (input.buffer.byteLength > ASSISTANT_DOCUMENT_UPLOAD_MAX_BYTES) {
    return { ok: false, error: 'Document exceeds max upload size', status: 413 };
  }

  const quota = await assertDocumentQuota(ownerId);
  if (!quota.ok) return quota;

  let extracted: { text: string; truncated: boolean; usedOcr?: boolean };
  try {
    extracted = await extractByExt(ext, input.buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('password') || msg.includes('encrypted')) {
      return { ok: false, error: 'Failed to extract PDF text (password-protected)', status: 422 };
    }
    return {
      ok: false,
      error: `Failed to extract ${ext} text`,
      status: 422,
    };
  }

  if (!extracted.text.trim()) {
    return { ok: false, error: 'Document has no extractable text', status: 422 };
  }

  const documentId = randomUUID();
  const now = Date.now();
  const expiresAtMs = now + ttlMs();
  const charCount = extracted.text.length;
  const usedOcr = Boolean(extracted.usedOcr);
  const row: StoredAssistantDocument = {
    userId: ownerId,
    filename,
    extractedText: extracted.text,
    charCount,
    truncated: extracted.truncated,
    createdAtMs: now,
    expiresAtMs,
  };

  if (process.env.DATABASE_URL) {
    await dbPutAssistantChatDocument({
      id: documentId,
      userId: ownerId,
      filename: row.filename,
      extractedText: row.extractedText,
      charCount: row.charCount,
      truncated: row.truncated,
      expiresAt: new Date(expiresAtMs),
    });
  } else {
    store.set(documentId, row);
  }

  return {
    ok: true,
    documentId,
    filename: row.filename,
    charCount: row.charCount,
    truncated: row.truncated,
    usedOcr: usedOcr || undefined,
  };
}

export async function getAssistantDocument(
  documentId: string,
  userId: string,
): Promise<StoredAssistantDocument | null> {
  if (!documentId.trim() || !userId.trim()) return null;
  if (process.env.DATABASE_URL) {
    const row = await dbGetAssistantChatDocument(documentId, userId.trim());
    if (!row) return null;
    const now = Date.now();
    return {
      userId: userId.trim(),
      filename: row.filename,
      extractedText: row.extractedText,
      charCount: row.charCount,
      truncated: row.truncated,
      createdAtMs: now,
      expiresAtMs: now + ttlMs(),
    };
  }
  purgeExpired();
  const entry = store.get(documentId);
  if (!entry) return null;
  if (entry.userId !== userId.trim()) return null;
  if (entry.expiresAtMs <= Date.now()) {
    store.delete(documentId);
    return null;
  }
  return entry;
}

export type AssistantResolvedDocument = {
  id: string;
  filename: string;
  extractedText: string;
  charCount: number;
};

export type ResolveAssistantDocumentsResult =
  | { ok: true; documents: AssistantResolvedDocument[] }
  | { ok: false; error: string };

export async function resolveAssistantDocuments(
  documentIds: string[],
  userId: string,
): Promise<ResolveAssistantDocumentsResult> {
  const documents: AssistantResolvedDocument[] = [];
  for (const id of documentIds) {
    const entry = await getAssistantDocument(id, userId);
    if (!entry) {
      return { ok: false, error: `Document not found or expired: ${id}` };
    }
    documents.push({
      id,
      filename: entry.filename,
      extractedText: entry.extractedText,
      charCount: entry.charCount,
    });
  }
  return { ok: true, documents };
}
