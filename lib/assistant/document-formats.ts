/**
 * Client-safe document extension helpers (no mammoth/pdf-parse).
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { ASSISTANT_DOCUMENT_EXTENSIONS } from '@/lib/constants';

export type AssistantDocumentExt = (typeof ASSISTANT_DOCUMENT_EXTENSIONS)[number];

export function extensionOfAssistantDocument(filename: string): AssistantDocumentExt | null {
  const lower = filename.trim().toLowerCase();
  for (const ext of ASSISTANT_DOCUMENT_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext;
  }
  return null;
}

export function isAssistantDocumentFilename(filename: string): boolean {
  return extensionOfAssistantDocument(filename) != null;
}
