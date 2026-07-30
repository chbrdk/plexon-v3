import { describe, expect, it } from 'vitest';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

describe('event quick check deep scan banner copy', () => {
  it('defines background banner strings for GEO gate', () => {
    expect(EQC_PAGE_COPY.deepScanBannerTitle).toContain('Hintergrund');
    expect(EQC_PAGE_COPY.deepScanBannerLead).toContain('GEO-Fragen');
    expect(EQC_PAGE_COPY.deepScanBannerCompleteTitle).toContain('abgeschlossen');
  });
});
