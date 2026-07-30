import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generatePlexonEcosystemPptx } from '../scripts/generate-plexon-ecosystem-pptx.mjs';
import {
  ECOSYSTEM_PPTX_FILENAME,
  ECOSYSTEM_PPTX_RELATIVE,
  ecosystemPptxAbsolutePath,
} from '@/lib/paths/ecosystem-pptx';

function isPptxBuffer(data: Buffer): boolean {
  return data.length >= 2 && data[0] === 0x50 && data[1] === 0x4b;
}

describe('plexon ecosystem pptx', () => {
  it('keeps presentation path constants stable', () => {
    expect(ECOSYSTEM_PPTX_FILENAME).toBe('plexon-oekosystem.pptx');
    expect(ECOSYSTEM_PPTX_RELATIVE).toBe(path.join('assets', 'presentations', ECOSYSTEM_PPTX_FILENAME));
    expect(ecosystemPptxAbsolutePath('/tmp/plexon')).toBe(
      path.join('/tmp/plexon', 'assets', 'presentations', ECOSYSTEM_PPTX_FILENAME)
    );
  });

  it('generates a valid PPTX with the expected slide count', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plexon-ecosystem-pptx-'));
    try {
      const result = await generatePlexonEcosystemPptx({ outDir });
      expect(result.slideCount).toBe(12);
      expect(isPptxBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(5_000);
      expect(fs.existsSync(result.absolutePath)).toBe(true);
      expect(path.basename(result.absolutePath)).toBe(ECOSYSTEM_PPTX_FILENAME);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
