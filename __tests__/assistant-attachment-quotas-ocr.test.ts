import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER,
  ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR,
  ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER,
  ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR,
} from '@/lib/constants';
import { evaluateAttachmentQuota } from '@/lib/assistant/attachment-quotas';
import { extractPdfText } from '@/lib/assistant/extract-pdf';
import {
  putAssistantImage,
  resetAssistantImageUploadStore,
} from '@/lib/assistant/image-upload-store';
import {
  putAssistantDocument,
  resetAssistantDocumentUploadStore,
} from '@/lib/assistant/document-upload-store';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const USER = 'quota-user';

async function blankPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

async function textPdf(content: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(content, { x: 24, y: 150, size: 14, font });
  return Buffer.from(await doc.save());
}

describe('attachment quotas — evaluate', () => {
  it('allows under limits', () => {
    expect(
      evaluateAttachmentQuota({ kind: 'image', activeCount: 0, recentHourCount: 0 }).ok,
    ).toBe(true);
  });

  it('blocks active cap', () => {
    const r = evaluateAttachmentQuota({
      kind: 'image',
      activeCount: ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER,
      recentHourCount: 0,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(429);
  });

  it('blocks hourly cap for documents', () => {
    const r = evaluateAttachmentQuota({
      kind: 'document',
      activeCount: 0,
      recentHourCount: ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(429);
    expect(r.error).toMatch(/hour/i);
  });

  it('exports canonical hour limits', () => {
    expect(ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR).toBeGreaterThan(0);
    expect(ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER).toBeGreaterThan(0);
  });
});

describe('attachment quotas — store enforcement', () => {
  afterEach(() => {
    resetAssistantImageUploadStore();
    resetAssistantDocumentUploadStore();
    delete process.env.DATABASE_URL;
  });

  it('rejects image put at active quota', async () => {
    delete process.env.DATABASE_URL;
    for (let i = 0; i < ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER; i++) {
      const put = await putAssistantImage(tinyPng, USER);
      expect(put.ok).toBe(true);
    }
    const blocked = await putAssistantImage(tinyPng, USER);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.status).toBe(429);
  });

  it('rejects document put at active quota', async () => {
    delete process.env.DATABASE_URL;
    for (let i = 0; i < ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER; i++) {
      const put = await putAssistantDocument({
        userId: USER,
        filename: `n${i}.txt`,
        buffer: Buffer.from(`note ${i}`),
      });
      expect(put.ok).toBe(true);
    }
    const blocked = await putAssistantDocument({
      userId: USER,
      filename: 'overflow.txt',
      buffer: Buffer.from('nope'),
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.status).toBe(429);
  });
});

describe('PDF OCR fallback', () => {
  it('runs OCR when embedded text is thin', async () => {
    const buf = await blankPdf();
    const ocrPage = vi.fn(async () => 'Scanned headline');
    const result = await extractPdfText(buf, 10_000, {
      enableOcr: true,
      minTextChars: 40,
      maxOcrPages: 1,
      ocrPage,
    });
    expect(ocrPage).toHaveBeenCalled();
    expect(result.usedOcr).toBe(true);
    expect(result.text).toContain('Scanned headline');
    expect(result.text).toContain('[OCR from scanned PDF]');
  });

  it('skips OCR when embedded text is rich', async () => {
    const body = 'A'.repeat(80);
    const buf = await textPdf(body);
    const ocrPage = vi.fn(async () => 'should-not-run');
    const result = await extractPdfText(buf, 10_000, {
      enableOcr: true,
      minTextChars: 40,
      ocrPage,
    });
    expect(ocrPage).not.toHaveBeenCalled();
    expect(result.usedOcr).toBe(false);
    expect(result.text.length).toBeGreaterThanOrEqual(40);
  });

  it('can disable OCR', async () => {
    const buf = await blankPdf();
    const ocrPage = vi.fn(async () => 'nope');
    const result = await extractPdfText(buf, 10_000, {
      enableOcr: false,
      ocrPage,
    });
    expect(ocrPage).not.toHaveBeenCalled();
    expect(result.usedOcr).toBe(false);
  });
});

describe('quota + OCR surface smoke', () => {
  const root = join(__dirname, '..');

  it('wires constants, extract OCR, and quota helpers', () => {
    const constants = readFileSync(join(root, 'lib/constants.ts'), 'utf8');
    expect(constants).toContain('ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER');
    expect(constants).toContain('ASSISTANT_PDF_OCR_MAX_PAGES');

    const extract = readFileSync(join(root, 'lib/assistant/extract-pdf.ts'), 'utf8');
    expect(extract).toContain('getScreenshot');
    expect(extract).toContain('ocrPngBuffer');

    const imageSpec = readFileSync(
      join(root, 'specs/domain/assistant-image-attachments.md'),
      'utf8',
    );
    expect(imageSpec).toContain('ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER');

    const docSpec = readFileSync(
      join(root, 'specs/domain/assistant-document-attachments.md'),
      'utf8',
    );
    expect(docSpec).toContain('tesseract');
    expect(docSpec).toContain('ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR');
  });
});
