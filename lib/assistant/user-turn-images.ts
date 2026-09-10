/**
 * Normalize Complete `imageIds` and build Anthropic user-turn content with Vision parts.
 * Spec: specs/domain/assistant-image-attachments.md
 */

import {
  ASSISTANT_IMAGE_EMPTY_PROMPT_FALLBACK,
  ASSISTANT_IMAGE_MAX_PER_TURN,
} from '@/lib/constants';
import {
  isAllowedAssistantImageMime,
  type AssistantResolvedImage,
} from '@/lib/assistant/image-upload-store';

export type AnthropicUserImagePart = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};

export type AnthropicUserTextPart = { type: 'text'; text: string };

export type AnthropicUserContentPart = AnthropicUserTextPart | AnthropicUserImagePart;

export function normalizeAssistantImageIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= ASSISTANT_IMAGE_MAX_PER_TURN) break;
  }
  return ids;
}

export function parseDataUrlForAnthropic(
  dataUrl: string,
): { mediaType: string; data: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match?.[1] || !match[2]) return null;
  let mediaType = match[1].toLowerCase();
  if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
  if (!isAllowedAssistantImageMime(mediaType)) return null;
  const data = match[2].replace(/\s+/g, '');
  if (!data || data.length < 8 || !/^[A-Za-z0-9+/]+=*$/.test(data)) return null;
  return { mediaType, data };
}

/** Build Anthropic user content for the current turn (text + optional images). */
export function buildUserTurnContent(
  prompt: string,
  images: AssistantResolvedImage[] = [],
): string | AnthropicUserContentPart[] {
  const text =
    prompt.trim() ||
    (images.length > 0 ? ASSISTANT_IMAGE_EMPTY_PROMPT_FALLBACK : '');
  if (images.length === 0) return text || '(no prompt)';

  const parts: AnthropicUserContentPart[] = [{ type: 'text', text }];
  for (const image of images) {
    const parsed = parseDataUrlForAnthropic(image.dataUrl);
    if (!parsed) continue;
    parts.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: parsed.mediaType,
        data: parsed.data,
      },
    });
  }
  // If caller supplied images but none were parseable, fall back to text only.
  return parts.length > 1 ? parts : text || '(no prompt)';
}

/** True when at least one image yields a Vision block. */
export function countParseableAssistantImages(images: AssistantResolvedImage[]): number {
  let n = 0;
  for (const image of images) {
    if (parseDataUrlForAnthropic(image.dataUrl)) n += 1;
  }
  return n;
}
