import { describe, expect, it } from 'vitest';
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas';
import type { EventQuickCheckReportPersonaSection } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';

function persona(partial: Partial<EventQuickCheckReportPersonaSection> & { id: string; name: string }) {
  return {
    segment: 'Segment',
    confidence: 0.8,
    headline: 'Headline',
    traits: [],
    goals: [],
    painPoints: [],
    interests: [],
    ...partial,
  } satisfies EventQuickCheckReportPersonaSection;
}

describe('resolveReportPersonas', () => {
  it('returns multi personas when present', () => {
    const personas = [
      persona({ id: '1', name: 'Anna' }),
      persona({ id: '2', name: 'Ben', geoQuestions: ['Q1'] }),
    ];
    expect(resolveReportPersonas({ persona: personas[0], personas })).toEqual(personas);
  });

  it('falls back to single persona', () => {
    const single = persona({ id: '1', name: 'Anna' });
    expect(resolveReportPersonas({ persona: single })).toEqual([single]);
  });

  it('returns empty when none', () => {
    expect(resolveReportPersonas({})).toEqual([]);
  });
});

describe('persona switcher copy', () => {
  it('defines multi-persona labels', () => {
    expect(EQC_REPORT_COPY.sectionPersonas).toContain('Personas');
    expect(EQC_REPORT_COPY.personaSwitcherLabel).toBe('Persona');
  });
});
