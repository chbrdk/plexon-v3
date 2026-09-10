/**
 * Merge resolved document text into the model-facing user message.
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { sanitizeAssistantAttachmentFilename } from '@/lib/assistant/sanitize-attachment-filename';

export type MergeDocumentInput = {
  filename: string;
  extractedText: string;
};

/** Prepend attached document blocks, then the user's visible message. */
export function mergeUserMessageWithDocuments(
  content: string,
  documents: MergeDocumentInput[],
): string {
  if (!documents.length) return content || '';

  const blocks: string[] = [];
  for (const doc of documents) {
    const fn = sanitizeAssistantAttachmentFilename(doc.filename || 'document', 'document');
    const body = (doc.extractedText || '').trim();
    if (!body) continue;
    blocks.push(`### Attached document: ${fn}\n\n${body}`);
  }
  if (!blocks.length) return content || '';

  const prefix = `${blocks.join('\n\n---\n\n')}\n\n---\n\n`;
  const rest = (content || '').trim();
  return rest ? prefix + rest : prefix.replace(/\s+$/, '');
}
