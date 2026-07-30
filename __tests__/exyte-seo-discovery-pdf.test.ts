import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(__dirname, '../assets/exyte-discovery/Exyte-SEO-Discovery-Form.pdf');

describe('Exyte SEO discovery PDF', () => {
  it('is bilingual with coverage matrix and 20 questions', async () => {
    expect(fs.existsSync(pdfPath)).toBe(true);
    const doc = await PDFDocument.load(fs.readFileSync(pdfPath));
    const names = doc.getForm().getFields().map((f) => f.getName());

    expect(names).toContain('cover.audit_tech.ok');
    expect(names).toContain('cover.aeo.ok');
    expect(names).toContain('q01.domains');
    expect(names).toContain('q20.sonst');

    for (let i = 1; i <= 20; i += 1) {
      const prefix = `q${String(i).padStart(2, '0')}.`;
      expect(names.some((n) => n.startsWith(prefix))).toBe(true);
    }

    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });
});
