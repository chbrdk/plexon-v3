import { describe, expect, it } from 'vitest';
import {
  buildCitationCompetitorChart,
  buildCitationPositionChart,
  buildCompetitorScoreChart,
  citationQueryChartLabel,
} from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';

describe('build-event-quick-check-geo-charts', () => {
  it('builds horizontal citation position chart', () => {
    const model = buildCitationPositionChart([
      {
        query: 'Welche sind die besten Werkzeugmarken für Schraubendreher in Deutschland? (Wera)',
        domain: 'wera.de',
        position: 1,
      },
      {
        query: 'Top Hersteller für Ratschen (Wera)',
        domain: 'wera.de',
        position: 3,
      },
    ]);
    expect(model?.horizontal).toBe(true);
    expect(model?.values).toEqual([1, 3]);
    expect(model?.labels[0]).not.toContain('(Wera)');
  });

  it('strips persona suffix from chart labels', () => {
    expect(citationQueryChartLabel('GEO Frage (Elena)', 0)).toBe('GEO Frage');
  });

  it('builds competitor score chart when at least two scores exist', () => {
    const model = buildCompetitorScoreChart([
      { name: 'wera.de', score: 61 },
      { name: 'competitor.de', score: 48 },
    ]);
    expect(model?.values).toEqual([61, 48]);
    expect(model?.horizontal).toBe(false);
  });

  it('builds grouped competitor citation chart with own domain and rivals', () => {
    const model = buildCitationCompetitorChart(
      [
        {
          query: 'best tools',
          citations: [
            { domain: 'wera.de', position: 1 },
            { domain: 'competitor.de', position: 2 },
          ],
        },
      ],
      'wera.de',
      ['competitor.de']
    );
    expect(model?.series.some((s) => s.isOwn)).toBe(true);
    expect(model?.series.some((s) => s.label.includes('competitor'))).toBe(true);
    expect(model?.rows[0]?.['wera.de']).toBe(1);
    expect(model?.rows[0]?.['competitor.de']).toBe(2);
  });
});
