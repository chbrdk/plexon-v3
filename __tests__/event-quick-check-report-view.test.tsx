import { describe, expect, it } from 'vitest';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture';

describe('EventQuickCheckReportView data', () => {
  it('receives humanized persona goals and trait labels without object Object', () => {
    const model = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture()
    );
    expect(model.executive.kpiTiles.length).toBeGreaterThanOrEqual(6);
    expect(model.persona?.name).toBe('Elena');
    expect(model.persona?.traits.some((t) => t.displayName === 'Detail-orientiert')).toBe(true);
    expect(model.persona?.goals.every((g) => !g.includes('[object Object]'))).toBe(true);
    expect(model.persona?.painPoints.every((p) => !p.includes('[object Object]'))).toBe(true);
    expect(model.insights?.findings.length).toBeGreaterThan(0);
  });

  it('keeps dual GEO layers as separate magazine chapters', () => {
    const fixture = eventQuickCheckBvikFixture();
    const recallJob = {
      jobId: 'geo-recall',
      url: fixture.url,
      status: 'completed',
      overallScore: 62,
      geoFitnessScore: 55,
      competitors: [],
      recommendations: [],
      citationHighlights: [],
    };
    fixture.geoJob = recallJob;
    fixture.geoJobs = [
      { measurement: 'recall', job: recallJob },
      {
        measurement: 'live',
        job: { ...recallJob, jobId: 'geo-live', overallScore: 41 },
      },
    ];
    const model = buildEventQuickCheckReportModel(fixture);
    expect(model.geo.measurement).toBe('recall');
    expect(model.geoLayers).toHaveLength(2);
    expect(model.geoLayers?.[1]?.measurement).toBe('live');
    expect(model.geoLayers?.[1]?.overallScore).toBe(41);
  });
});
