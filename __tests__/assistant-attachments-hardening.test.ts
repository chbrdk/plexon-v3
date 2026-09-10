import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  expireAssistantImageForTests,
  putAssistantImage,
  resetAssistantImageUploadStore,
  resolveAssistantImages,
} from '@/lib/assistant/image-upload-store';
import {
  expireAssistantDocumentForTests,
  putAssistantDocument,
  resetAssistantDocumentUploadStore,
  resolveAssistantDocuments,
} from '@/lib/assistant/document-upload-store';
import {
  buildUserTurnContent,
  countParseableAssistantImages,
  parseDataUrlForAnthropic,
} from '@/lib/assistant/user-turn-images';
import { mergeUserMessageWithDocuments } from '@/lib/assistant/merge-documents';
import { sanitizeAssistantAttachmentFilename } from '@/lib/assistant/sanitize-attachment-filename';
import { extractPptxText } from '@/lib/assistant/extract-pptx';
import JSZip from 'jszip';

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const USER_A = 'user-a';

describe('attachment hardening — images', () => {
  beforeEach(() => {
    resetAssistantImageUploadStore();
    delete process.env.DATABASE_URL;
  });
  afterEach(() => resetAssistantImageUploadStore());

  it('rejects SVG data URLs', async () => {
    const svg =
      'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
    const put = await putAssistantImage(svg, USER_A);
    expect(put.ok).toBe(false);
    if (put.ok) return;
    expect(put.status).toBe(415);
  });

  it('rejects malformed base64 payloads', async () => {
    const put = await putAssistantImage('data:image/png;base64,!!!', USER_A);
    expect(put.ok).toBe(false);
    if (put.ok) return;
    expect(put.status).toBe(400);
  });

  it('rejects non-base64 image data URLs', async () => {
    const put = await putAssistantImage('data:image/png,not-base64', USER_A);
    expect(put.ok).toBe(false);
  });

  it('fail-closes resolve after TTL expiry', async () => {
    const put = await putAssistantImage(tinyPng, USER_A);
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expireAssistantImageForTests(put.imageId);
    const resolved = await resolveAssistantImages([put.imageId], USER_A);
    expect(resolved.ok).toBe(false);
  });

  it('parseDataUrlForAnthropic rejects svg and junk', () => {
    expect(parseDataUrlForAnthropic(tinyPng)?.mediaType).toBe('image/png');
    expect(
      parseDataUrlForAnthropic(
        'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64'),
      ),
    ).toBeNull();
    expect(parseDataUrlForAnthropic('data:image/png;base64,')).toBeNull();
  });

  it('countParseableAssistantImages detects unusable payloads', () => {
    expect(countParseableAssistantImages([{ id: '1', dataUrl: tinyPng }])).toBe(1);
    expect(
      countParseableAssistantImages([{ id: '1', dataUrl: 'data:image/png;base64,xx' }]),
    ).toBe(0);
    const content = buildUserTurnContent('hi', [
      { id: '1', dataUrl: 'data:image/png;base64,not@@valid' },
    ]);
    expect(typeof content).toBe('string');
  });
});

describe('attachment hardening — documents', () => {
  beforeEach(() => {
    resetAssistantDocumentUploadStore();
    delete process.env.DATABASE_URL;
  });
  afterEach(() => resetAssistantDocumentUploadStore());

  it('sanitizes path traversal filenames', () => {
    expect(sanitizeAssistantAttachmentFilename('../../etc/passwd.docx')).toBe('passwd.docx');
    expect(sanitizeAssistantAttachmentFilename('a\nb\tc.md')).toBe('a b c.md');
    expect(sanitizeAssistantAttachmentFilename('...')).toBe('document');
  });

  it('merge uses sanitized filenames', () => {
    const out = mergeUserMessageWithDocuments('Q', [
      { filename: '../secret.pdf', extractedText: 'body' },
    ]);
    expect(out).toContain('### Attached document: secret.pdf');
    expect(out).not.toContain('../');
  });

  it('rejects empty buffers', async () => {
    const put = await putAssistantDocument({
      userId: USER_A,
      filename: 'empty.txt',
      buffer: Buffer.alloc(0),
    });
    expect(put.ok).toBe(false);
    if (put.ok) return;
    expect(put.status).toBe(400);
  });

  it('sanitizes stored filename from nested paths', async () => {
    const put = await putAssistantDocument({
      userId: USER_A,
      filename: 'C:\\\\Users\\\\x\\\\brief.md',
      buffer: Buffer.from('# hi'),
    });
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expect(put.filename).toBe('brief.md');
  });

  it('fail-closes document resolve after TTL expiry', async () => {
    const put = await putAssistantDocument({
      userId: USER_A,
      filename: 'note.txt',
      buffer: Buffer.from('hello'),
    });
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expireAssistantDocumentForTests(put.documentId);
    const resolved = await resolveAssistantDocuments([put.documentId], USER_A);
    expect(resolved.ok).toBe(false);
  });

  it('pptx extract handles empty buffer and caps slides', async () => {
    const empty = await extractPptxText(Buffer.alloc(0), 1000);
    expect(empty.text).toBe('');

    const zip = new JSZip();
    for (let i = 1; i <= 5; i++) {
      zip.file(
        `ppt/slides/slide${i}.xml`,
        `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>S${i}</a:t></p:sld>`,
      );
    }
    const buf = Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
    const { text } = await extractPptxText(buf, 10_000);
    expect(text).toContain('S1');
    expect(text).toContain('S5');
  });
});
