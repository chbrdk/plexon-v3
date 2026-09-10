/**
 * PDF → plain text extraction (pdf-parse) with optional OCR fallback for scans.
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { PDFParse } from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';
import {
  ASSISTANT_PDF_OCR_LANGS,
  ASSISTANT_PDF_OCR_MAX_PAGES,
  ASSISTANT_PDF_OCR_MIN_TEXT_CHARS,
  ASSISTANT_PDF_OCR_SCALE,
} from '@/lib/constants';
import { ocrPngBuffer } from '@/lib/assistant/ocr-png';

const TRUNCATION_MARKER = '\n\n[… truncated]';
const OCR_HEADER = '[OCR from scanned PDF]\n\n';

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false };
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true };
}

export type ExtractPdfOptions = {
  /** Skip OCR even when embedded text is thin (tests / callers). */
  enableOcr?: boolean;
  /** Inject OCR for tests. */
  ocrPage?: (png: Buffer) => Promise<string>;
  minTextChars?: number;
  maxOcrPages?: number;
  ocrScale?: number;
  ocrLangs?: string;
};

async function ocrPdfPages(
  buffer: Buffer,
  opts: Required<
    Pick<ExtractPdfOptions, 'maxOcrPages' | 'ocrScale' | 'ocrLangs'>
  > &
    Pick<ExtractPdfOptions, 'ocrPage'>,
): Promise<string> {
  const data = Uint8Array.from(buffer);
  const parser = new PDFParse({ data, CanvasFactory });
  try {
    const shot = await parser.getScreenshot({
      first: opts.maxOcrPages,
      scale: opts.ocrScale,
      imageBuffer: true,
      imageDataUrl: false,
    });
    const pages = shot.pages || [];
    const chunks: string[] = [];
    for (const page of pages) {
      if (!page?.data?.byteLength) continue;
      const png = Buffer.from(page.data);
      const text = opts.ocrPage
        ? await opts.ocrPage(png)
        : await ocrPngBuffer(png, opts.ocrLangs);
      const cleaned = text.trim();
      if (cleaned) {
        chunks.push(`--- page ${page.pageNumber} ---\n${cleaned}`);
      }
    }
    return chunks.join('\n\n').trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function extractPdfText(
  buffer: Buffer,
  maxChars: number,
  options: ExtractPdfOptions = {},
): Promise<{ text: string; truncated: boolean; usedOcr: boolean }> {
  const enableOcr = options.enableOcr !== false;
  const minTextChars = options.minTextChars ?? ASSISTANT_PDF_OCR_MIN_TEXT_CHARS;
  const maxOcrPages = options.maxOcrPages ?? ASSISTANT_PDF_OCR_MAX_PAGES;
  const ocrScale = options.ocrScale ?? ASSISTANT_PDF_OCR_SCALE;
  const ocrLangs = options.ocrLangs ?? ASSISTANT_PDF_OCR_LANGS;

  // pdfjs may transfer TypedArray ownership — copy so Buffer stays valid.
  const data = Uint8Array.from(buffer);
  const parser = new PDFParse({ data });
  let embedded = '';
  try {
    const result = await parser.getText();
    embedded = (result?.text || '').replace(/\r\n/g, '\n').trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }

  if (embedded.length >= minTextChars || !enableOcr) {
    return { ...applyCharCap(embedded, maxChars), usedOcr: false };
  }

  try {
    const ocrText = await ocrPdfPages(buffer, {
      maxOcrPages,
      ocrScale,
      ocrLangs,
      ocrPage: options.ocrPage,
    });
    if (!ocrText) {
      return { ...applyCharCap(embedded, maxChars), usedOcr: false };
    }
    const merged = embedded
      ? `${embedded}\n\n${OCR_HEADER}${ocrText}`
      : `${OCR_HEADER}${ocrText}`;
    return { ...applyCharCap(merged, maxChars), usedOcr: true };
  } catch {
    // OCR is best-effort; fall back to whatever embedded text we had.
    return { ...applyCharCap(embedded, maxChars), usedOcr: false };
  }
}
