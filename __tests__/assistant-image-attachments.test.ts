import { afterEach, describe, expect, it } from 'vitest';
import {
  assistantImageUploadStoreSize,
  putAssistantImage,
  resetAssistantImageUploadStore,
  resolveAssistantImages,
} from '@/lib/assistant/image-upload-store';
import {
  ASSISTANT_IMAGE_EMPTY_PROMPT_FALLBACK,
  ASSISTANT_IMAGE_MAX_PER_TURN,
} from '@/lib/constants';
import {
  buildUserTurnContent,
  normalizeAssistantImageIds,
  parseDataUrlForAnthropic,
} from '@/lib/assistant/user-turn-images';
import { buildMessages } from '@/lib/assistant/orchestrator-complete';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('assistant image upload store', () => {
  afterEach(() => {
    resetAssistantImageUploadStore();
    delete process.env.DATABASE_URL;
  });

  it('puts and resolves images in memory', async () => {
    const put = await putAssistantImage(tinyPng, USER_A);
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expect(assistantImageUploadStoreSize()).toBe(1);
    const resolved = await resolveAssistantImages([put.imageId], USER_A);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.images[0]?.dataUrl).toBe(tinyPng);
  });

  it('rejects non-image data URLs', async () => {
    const put = await putAssistantImage('data:text/plain;base64,YQ==', USER_A);
    expect(put.ok).toBe(false);
    if (put.ok) return;
    expect(put.status).toBe(400);
  });

  it('fail-closes on missing ids', async () => {
    const resolved = await resolveAssistantImages(['missing-id'], USER_A);
    expect(resolved.ok).toBe(false);
  });

  it('fail-closes resolve for another user', async () => {
    const put = await putAssistantImage(tinyPng, USER_A);
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    const resolved = await resolveAssistantImages([put.imageId], USER_B);
    expect(resolved.ok).toBe(false);
  });
});

describe('assistant user-turn images', () => {
  it('normalizes and caps imageIds', () => {
    const ids = normalizeAssistantImageIds([
      ' a ',
      '',
      'a',
      'b',
      'c',
      'd',
      'e',
      1,
      null,
    ]);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect(ids).toHaveLength(ASSISTANT_IMAGE_MAX_PER_TURN);
  });

  it('parses data URLs for Anthropic', () => {
    expect(parseDataUrlForAnthropic(tinyPng)).toEqual({
      mediaType: 'image/png',
      data: tinyPng.split(',')[1],
    });
  });

  it('builds multimodal content for current turn', () => {
    const content = buildUserTurnContent('', [{ id: '1', dataUrl: tinyPng }]);
    expect(Array.isArray(content)).toBe(true);
    if (!Array.isArray(content)) return;
    expect(content[0]).toEqual({ type: 'text', text: ASSISTANT_IMAGE_EMPTY_PROMPT_FALLBACK });
    expect(content[1]?.type).toBe('image');
  });

  it('buildMessages keeps history text-only and attaches images on current turn', () => {
    const messages = buildMessages(
      [{ role: 'user', content: '(image attachment)' }],
      'Was siehst du?',
      [],
      [{ id: '1', dataUrl: tinyPng }],
    );
    expect(messages[0]).toEqual({ role: 'user', content: '(image attachment)' });
    expect(Array.isArray(messages[1]?.content)).toBe(true);
    const parts = messages[1]?.content as Array<{ type: string }>;
    expect(parts.some((p) => p.type === 'image')).toBe(true);
  });
});

describe('assistant image attachments surface smoke', () => {
  const root = join(__dirname, '..');

  it('ships domain spec + upload route + composer attach', () => {
    const spec = readFileSync(join(root, 'specs/domain/assistant-image-attachments.md'), 'utf8');
    expect(spec).toContain('API_ASSISTANT_IMAGES_UPLOAD');
    expect(spec).toContain('imageIds');

    const route = readFileSync(
      join(root, 'app/api/assistant/images/upload/route.ts'),
      'utf8',
    );
    expect(route).toContain('putAssistantImage');
    expect(route).toContain('user.id');

    const composer = readFileSync(
      join(root, 'components/assistant/AssistantChatComposer.tsx'),
      'utf8',
    );
    expect(composer).toContain('IconPaperclip');
    expect(composer).toContain('pendingImages');
    expect(composer).toContain('onPaste');
    expect(composer).toContain('onDrop');
    expect(composer).toContain('is-drop-active');
    expect(composer).toContain('accept={`image/*,${ASSISTANT_DOCUMENT_UPLOAD_ACCEPT}`}');

    const chat = readFileSync(join(root, 'components/assistant/AssistantChat.tsx'), 'utf8');
    expect(chat).toContain('API_ASSISTANT_IMAGES_UPLOAD');
    expect(chat).toContain('imageIds');
  });
});
