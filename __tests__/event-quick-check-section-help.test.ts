import { describe, expect, it } from 'vitest';
import {
  EQC_SECTION_HELP,
  eqcSectionHelpAriaLabel,
} from '@/lib/assistant/event-quick-check/event-quick-check-section-help';

describe('event-quick-check-section-help', () => {
  it('defines help text for every dashboard chapter', () => {
    expect(Object.keys(EQC_SECTION_HELP).sort()).toEqual([
      'appendix',
      'domain',
      'domainComparison',
      'geo',
      'insights',
      'kpi',
      'market',
      'overview',
      'persona',
    ]);
    for (const text of Object.values(EQC_SECTION_HELP)) {
      expect(text.length).toBeGreaterThan(20);
    }
  });

  it('builds accessible aria labels from section titles', () => {
    expect(eqcSectionHelpAriaLabel('GEO & Wettbewerb')).toBe('Erklärung: GEO & Wettbewerb');
  });
});
