import { describe, expect, it } from 'vitest';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { buildEventQuickCheckReportLayoutFromQuick } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';

function baseResult(overrides: Partial<EventQuickCheckResult> = {}): EventQuickCheckResult {
  return {
    ok: true,
    playbookId: 'event_quick_check',
    playbookLabel: QUICK_CHECK_LABEL,
    projectName: 'Acme',
    url: 'https://acme.com',
    platformProjectId: 'pp-1',
    outcomes: [
      { stepId: 'domain_scan', label: 'Domain-Scan', status: 'done' },
      { stepId: 'persona_bootstrap', label: 'Persona', status: 'done' },
      { stepId: 'geo_check', label: 'GEO', status: 'done' },
    ],
    steps: [],
    geoQuestions: ['Frage 1', 'Frage 2', 'Frage 3'],
    personaPreview: {
      projectId: 'a1',
      projectName: 'Acme',
      targetGroupId: 'tg1',
      targetGroupName: 'Marketing',
      persona: {
        id: 'p1',
        name: 'Anna',
        segment: 'B2B',
        confidence: 0.9,
        headline: 'Headline',
        profile: {
          traits: [
            { name: 'Analytical', score: 0.8 },
            { name: 'Pragmatic', score: 0.7 },
          ],
          goals: ['Find reliable vendors'],
          painPoints: ['Opaque pricing'],
        },
      },
    },
    domainScan: {
      id: 'scan-1',
      domain: 'acme.com',
      url: 'https://acme.com',
      status: 'complete',
      totalPages: 50,
      score: 78,
      stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
      topIssues: [{ title: 'Missing meta description', count: 12 }],
    },
    geoJob: {
      jobId: 'geo-1',
      url: 'https://acme.com',
      status: 'complete',
      overallScore: 72,
      geoFitnessScore: 65,
      eeatScores: {
        trust: { score: 3, reasoning: 'Privacy present' },
        expertise: { score: 4 },
      },
      competitors: [
        { name: 'rival.com', score: 65, shareOfVoice: 0.3, avgPosition: 3.2, mentionCount: 4 },
      ],
      recommendations: [{ title: 'Expand FAQ', description: 'Improve GEO snippets', priority: 2 }],
    },
    ...overrides,
  };
}

describe('buildEventQuickCheckReportLayoutFromQuick', () => {
  it('builds a single event_quick_check_report block with full model sections', () => {
    const layout = buildEventQuickCheckReportLayoutFromQuick(baseResult());
    expect(layout).toHaveProperty('blocks');
    if (!('blocks' in layout)) throw new Error('expected layout');
    expect(layout.blocks).toHaveLength(1);
    expect(layout.blocks[0]?.type).toBe('event_quick_check_report');
    const report = layout.blocks[0]?.props.report as Record<string, unknown>;
    expect(report.meta).toBeDefined();
    expect(report.executive).toBeDefined();
    expect(report.domain).toBeDefined();
    expect(report.persona).toBeDefined();
    expect(report.geo).toBeDefined();
    expect(report.workflow).toBeDefined();
    expect(report.appendix).toBeDefined();
  });

  it('includes geo error status when geo step failed', () => {
    const layout = buildEventQuickCheckReportLayoutFromQuick(
      baseResult({
        ok: false,
        geoJob: undefined,
        outcomes: [{ stepId: 'geo_check', label: 'GEO', status: 'error', error: 'Timeout' }],
      })
    );
    if (!('blocks' in layout)) throw new Error('expected layout');
    const report = layout.blocks[0]?.props.report as { geo: { status: string; errorMessage?: string } };
    expect(report.geo.status).toBe('failed');
    expect(report.geo.errorMessage).toContain('Timeout');
  });

  it('omits persona section when audion setup required', () => {
    const layout = buildEventQuickCheckReportLayoutFromQuick(
      baseResult({
        ok: false,
        audionSetupRequired: true,
        checkionOnly: true,
        personaPreview: undefined,
        outcomes: [
          {
            stepId: 'ensure_audion',
            label: 'AUDION-Projekt einrichten',
            status: 'error',
            error: 'Kein AUDION-Projekt',
          },
        ],
      })
    );
    if (!('blocks' in layout)) throw new Error('expected layout');
    const report = layout.blocks[0]?.props.report as { persona?: unknown };
    expect(report.persona).toBeUndefined();
  });

  it('includes persona traits when persona succeeded', () => {
    const layout = buildEventQuickCheckReportLayoutFromQuick(
      baseResult({
        audionSetupRequired: false,
        personaPreview: baseResult().personaPreview,
      })
    );
    if (!('blocks' in layout)) throw new Error('expected layout');
    const report = layout.blocks[0]?.props.report as { persona?: { traits: unknown[] } };
    expect(report.persona?.traits.length).toBeGreaterThan(0);
  });
});
