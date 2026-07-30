import { describe, expect, it } from 'vitest';
import { buildReportLayout } from '@/lib/assistant/reports/build-report-layout';
import type { ReportNarrative } from '@/lib/assistant/reports/types';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';

const narrative: ReportNarrative = {
  title: 'Schott Analyse',
  intro: 'Kontext zum Projekt.',
  executiveSummary: 'Die Website schneidet solide ab.',
  fazit: 'Weiter optimieren.',
  fazitTone: 'success',
  findings: [{ title: 'GEO', description: 'Score unter Branchendurchschnitt.', severity: 'warning' }],
  recommendations: [{ title: 'Kontrast prüfen', description: 'AA-Kontrast auf Startseite.', priority: 2 }],
};

const pinned: UiBlock[] = [
  {
    id: 'pin-1',
    type: 'metric_grid',
    props: { title: 'Scores', items: [{ label: 'GEO', value: 72 }] },
  },
];

describe('build-report-layout', () => {
  it('composes structured UI blocks for narrative sections', () => {
    const layout = buildReportLayout(narrative, pinned);
    expect(layout.blocks.some((b) => b.type === 'alert' && b.props.title === 'Zusammenfassung')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'finding_list')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'recommendation_list')).toBe(true);
    expect(layout.blocks.some((b) => b.id.startsWith('report-pin-pin-1'))).toBe(true);
    const fazit = layout.blocks.find((b) => b.type === 'alert' && b.props.title === 'Fazit');
    expect(fazit?.props.tone).toBe('success');
  });
});
