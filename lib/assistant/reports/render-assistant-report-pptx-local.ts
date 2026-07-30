import PptxGenJS from 'pptxgenjs';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { blockToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';

export function isPptxBuffer(data: Buffer): boolean {
  return data.length >= 2 && data[0] === 0x50 && data[1] === 0x4b;
}

function splitParagraphToBullets(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  return normalized.split(/\n+/).map((line) => line.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
}

/**
 * Minimal local PPTX fallback when CHECKION is unavailable (plain slides, no MSQDX master).
 */
export async function renderAssistantReportPptxLocal(input: {
  title: string;
  uiLayout: UiLayout;
}): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'PLEXON';
  pptx.company = 'MSQDX';
  pptx.title = input.title;

  const cover = pptx.addSlide();
  cover.addText('PLEXON Assistant Report', {
    x: 0.6,
    y: 1.2,
    w: 12,
    h: 0.5,
    fontSize: 14,
    color: '666666',
  });
  cover.addText(input.title, {
    x: 0.6,
    y: 1.9,
    w: 12,
    h: 1.5,
    fontSize: 32,
    bold: true,
    color: '111111',
  });

  for (const block of input.uiLayout.blocks) {
    const plain = blockToPlainText(block).trim();
    if (!plain) continue;
    const slide = pptx.addSlide();
    const lines = plain.split('\n');
    const slideTitle = lines[0]?.replace(/^#\s*/, '').slice(0, 120) ?? block.type;
    const body = lines.slice(1).join('\n').trim() || plain;
    slide.addText(slideTitle, {
      x: 0.6,
      y: 0.5,
      w: 12,
      h: 0.8,
      fontSize: 22,
      bold: true,
      color: '111111',
    });
    slide.addText(splitParagraphToBullets(body).map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), {
      x: 0.6,
      y: 1.5,
      w: 12,
      h: 5.5,
      fontSize: 14,
      color: '333333',
      valign: 'top',
    });
  }

  const output = await pptx.write({ outputType: 'nodebuffer' });
  const buf = Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
  if (!isPptxBuffer(buf)) {
    throw new Error('Local PPTX render did not produce a valid PPTX');
  }
  return buf;
}
