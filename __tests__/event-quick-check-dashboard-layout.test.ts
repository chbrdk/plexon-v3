import { describe, expect, it } from 'vitest';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout';
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture';

describe('resolveEventQuickCheckDashboardLayout', () => {
  it('allocates side-by-side persona and geo columns when both exist', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture()
    );
    const layout = resolveEventQuickCheckDashboardLayout(report);

    expect(layout.showDomain).toBe(true);
    expect(layout.showPersona).toBe(true);
    expect(layout.showGeoQuestions).toBe(true);
    expect(layout.showInsights).toBe(true);
    expect(layout.personaSpan).toBe(5);
    expect(layout.geoSpan).toBe(7);
    expect(layout.domainSpan).toBe(12);
  });

  it('uses full width when persona is missing', () => {
    const report = buildEventQuickCheckReportModel(
      { ...eventQuickCheckBvikFixture(), personaPreview: undefined },
      eventQuickCheckBvikNarrativeFixture()
    );
    const layout = resolveEventQuickCheckDashboardLayout(report);

    expect(layout.showPersona).toBe(false);
    expect(layout.personaSpan).toBe(12);
  });

  it('hides geo panel when only persona-bound questions exist', () => {
    const base = eventQuickCheckBvikFixture();
    const report = buildEventQuickCheckReportModel(
      {
        ...base,
        outcomes: base.outcomes.map((o) =>
          o.stepId === 'geo_check'
            ? { ...o, status: 'skipped' as const, error: undefined }
            : o
        ),
        geoJob: undefined,
        geoQuestions: ['Welche Marke ist führend?'],
      },
      eventQuickCheckBvikNarrativeFixture()
    );
    const layout = resolveEventQuickCheckDashboardLayout(report);

    expect(layout.showPersona).toBe(true);
    expect(layout.showGeoQuestions).toBe(true);
    expect(layout.geoSpan).toBe(0);
    expect(layout.personaSpan).toBe(12);
  });

  it('allocates the GEO chapter when competitors exist for share-of-voice', () => {
    const report = buildEventQuickCheckReportModel(
      {
        ...eventQuickCheckBvikFixture(),
        geoJob: {
          jobId: 'geo-only-comp',
          url: 'https://example.com',
          status: 'complete',
          competitors: [{ name: 'rival.de', score: 80 }],
        },
        outcomes: eventQuickCheckBvikFixture().outcomes.map((o) =>
          o.stepId === 'geo_check' ? { ...o, status: 'skipped' as const } : o
        ),
      },
      eventQuickCheckBvikNarrativeFixture()
    );
    const layout = resolveEventQuickCheckDashboardLayout(report);

    expect(layout.showGeoCompetitors).toBe(false);
    expect(layout.geoSpan).toBe(7);
  });
});
