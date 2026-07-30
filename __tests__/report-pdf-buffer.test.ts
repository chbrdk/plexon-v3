import { describe, expect, it } from 'vitest';
import { isPdfBuffer } from '@/lib/assistant/reports/render-assistant-report-pdf-local';

describe('isPdfBuffer', () => {
  it('detects PDF magic bytes', () => {
    expect(isPdfBuffer(Buffer.from('%PDF-1.7\n'))).toBe(true);
    expect(isPdfBuffer(Buffer.from('{"error":"x"}'))).toBe(false);
  });
});
