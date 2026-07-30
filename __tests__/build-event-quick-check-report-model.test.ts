import { describe, expect, it } from 'vitest';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';

describe('buildEventQuickCheckReportModel', () => {
  it('maps bvik fixture without object Object in goals', () => {
    const model = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture()
    );

    expect(model.templateId).toBe('event_quick_check');
    expect(model.domain?.score).toBe(57);
    expect(model.domain?.stats.errors).toBe(213);
    expect(model.persona?.name).toBe('Elena');
    expect(model.persona?.goals.length).toBeGreaterThan(0);
    expect(model.persona?.goals[0]).not.toContain('[object Object]');
    expect(model.geo.status).toBe('failed');
    expect(model.geo.errorMessage).toContain('timeout');
    expect(model.executive.kpiTiles.length).toBe(6);
    expect(model.insights?.recommendations[0]?.priority).toBe(1);
  });

  it('truncates long domain issue titles', () => {
    const model = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    expect(model.domain?.topIssues[0]?.title.length).toBeLessThanOrEqual(120);
  });

  it('maps multi personas with per-persona geo questions', () => {
    const base = eventQuickCheckBvikFixture();
    const multi: EventQuickCheckResult = {
      ...base,
      personaPreview: {
        projectId: 'p1',
        projectName: 'Acme',
        targetGroupId: 'tg1',
        targetGroupName: 'TG1',
        persona: {
          id: 'a',
          name: 'Anna',
          segment: 'Entscheider',
          confidence: 0.9,
          headline: 'H1',
          profile: { traits: [], goals: ['G1'], painPoints: ['P1'], interests: [] },
        },
        personas: [
          {
            id: 'a',
            name: 'Anna',
            segment: 'Entscheider',
            confidence: 0.9,
            headline: 'H1',
            profile: { traits: [], goals: ['G1'], painPoints: ['P1'], interests: [] },
          },
          {
            id: 'b',
            name: 'Ben',
            segment: 'Anwender',
            confidence: 0.8,
            headline: 'H2',
            profile: { traits: [], goals: ['G2'], painPoints: ['P2'], interests: [] },
          },
        ],
      },
      geoQuestionsByPersona: [
        { personaId: 'a', personaName: 'Anna', segment: 'Entscheider', questions: ['Q-Anna'] },
        { personaId: 'b', personaName: 'Ben', segment: 'Anwender', questions: ['Q-Ben'] },
      ],
    };

    const model = buildEventQuickCheckReportModel(multi);
    expect(model.personas).toHaveLength(2);
    expect(model.persona?.name).toBe('Anna');
    expect(model.personas?.[0].geoQuestions).toEqual(['Q-Anna']);
    expect(model.personas?.[1].geoQuestions).toEqual(['Q-Ben']);
  });
});
