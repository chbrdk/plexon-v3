import { afterEach, describe, expect, it } from 'vitest';
import {
  jpegHasApp1,
  stripAssistantImageDataUrlMetadata,
  stripJpegMetadata,
  stripPngMetadata,
} from '@/lib/assistant/strip-image-metadata';
import {
  putAssistantImage,
  resetAssistantImageUploadStore,
  resolveAssistantImages,
} from '@/lib/assistant/image-upload-store';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Minimal JPEG with APP1 (fake EXIF) then SOS+payload stub. */
function jpegWithApp1(): Uint8Array {
  const app1Payload = Buffer.from('Exif\0\0fake-gps');
  const app1Len = 2 + app1Payload.length;
  const parts = [
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff]),
    app1Payload,
    // SOF0 minimal (length 11)
    Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]),
    // SOS
    Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]),
    Buffer.from([0x00, 0x00, 0xff, 0xd9]),
  ];
  return new Uint8Array(Buffer.concat(parts));
}

function pngWithTextChunk(): Uint8Array {
  // Signature + IHDR (13 bytes data) + tEXt + IEND — CRC values need not be valid for stripper
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  const ihdrLen = Buffer.from([0, 0, 0, 13]);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  const textData = Buffer.from('Comment\0secret location');
  const textLen = Buffer.alloc(4);
  textLen.writeUInt32BE(textData.length, 0);
  const textType = Buffer.from('tEXt');
  const textCrc = Buffer.alloc(4);
  const iendLen = Buffer.from([0, 0, 0, 0]);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  return new Uint8Array(
    Buffer.concat([
      sig,
      ihdrLen,
      ihdrType,
      ihdrData,
      ihdrCrc,
      textLen,
      textType,
      textData,
      textCrc,
      iendLen,
      iendType,
      iendCrc,
    ]),
  );
}

describe('strip image metadata', () => {
  it('removes JPEG APP1 (EXIF)', () => {
    const raw = jpegWithApp1();
    expect(jpegHasApp1(raw)).toBe(true);
    const cleaned = stripJpegMetadata(raw);
    expect(jpegHasApp1(cleaned)).toBe(false);
    expect(cleaned[0]).toBe(0xff);
    expect(cleaned[1]).toBe(0xd8);
  });

  it('removes PNG tEXt chunks', () => {
    const raw = pngWithTextChunk();
    const asStr = Buffer.from(raw).toString('binary');
    expect(asStr.includes('tEXt')).toBe(true);
    const cleaned = stripPngMetadata(raw);
    expect(Buffer.from(cleaned).toString('binary').includes('tEXt')).toBe(false);
    expect(Buffer.from(cleaned).toString('binary').includes('IHDR')).toBe(true);
  });

  it('putAssistantImage persists stripped JPEG', async () => {
    delete process.env.DATABASE_URL;
    resetAssistantImageUploadStore();
    const raw = jpegWithApp1();
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(raw).toString('base64')}`;
    const put = await putAssistantImage(dataUrl, 'user-exif');
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    const resolved = await resolveAssistantImages([put.imageId], 'user-exif');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const storedB64 = resolved.images[0]!.dataUrl.split(',')[1]!;
    const stored = Buffer.from(storedB64, 'base64');
    expect(jpegHasApp1(stored)).toBe(false);
    // stripAssistantImageDataUrlMetadata is idempotent on cleaned output
    expect(stripAssistantImageDataUrlMetadata(resolved.images[0]!.dataUrl)).toBe(
      resolved.images[0]!.dataUrl,
    );
    resetAssistantImageUploadStore();
  });
});

describe('attach hint + EXIF surface smoke', () => {
  afterEach(() => resetAssistantImageUploadStore());

  const root = join(__dirname, '..');

  it('composer explains vision vs text and compress notes EXIF', () => {
    const composer = readFileSync(
      join(root, 'components/assistant/AssistantChatComposer.tsx'),
      'utf8',
    );
    expect(composer).toContain('assistant.attachHint');
    expect(composer).toContain('attachOcrBadge');

    const compress = readFileSync(join(root, 'lib/assistant/compress-image.ts'), 'utf8');
    expect(compress).toContain('EXIF');

    const store = readFileSync(join(root, 'lib/assistant/image-upload-store.ts'), 'utf8');
    expect(store).toContain('stripAssistantImageDataUrlMetadata');

    const locales = readFileSync(join(root, 'locales/de.json'), 'utf8');
    expect(locales).toContain('attachHint');
  });
});
