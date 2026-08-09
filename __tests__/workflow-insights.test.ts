import { describe, expect, it } from 'vitest'
import { buildWorkflowFollowUps } from '@/lib/assistant/insights/follow-up-suggestions'
import {
  buildDomainScanCrossSignals,
  buildEventQuickCheckCrossSignals,
  buildGeoCrossSignals,
  buildPlaybookCrossSignals,
  buildReadabilityCrossSignals,
  buildSslCrossSignals,
} from '@/lib/assistant/insights/cross-signals'
import { appendInsightBlocksToLayout } from '@/lib/assistant/insights/append-insight-blocks'
import {
  narrativeFromCrossSignals,
  narrativeFromEqcCrossSignals,
} from '@/lib/assistant/insights/generate-workflow-insights'
import {
  filterEqcMetaFindings,
  isEqcMetaFindingTitle,
  isEqcMetaSignal,
} from '@/lib/assistant/insights/eqc-insight-quality'
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types'

describe('workflow cross-signals', () => {
  it('builds GEO competitor and benchmark comparisons', () => {
    const signals = buildGeoCrossSignals(
      {
        jobId: 'j1',
        url: 'https://example.com',
        status: 'complete',
        overallScore: 62,
        competitors: [
          { name: 'A', score: 80 },
          { name: 'B', score: 70 },
        ],
        keywords: ['ai search', 'brand trust'],
      },
      {
        pageSpeed: {
          url: 'https://example.com',
          performance: 55,
          accessibility: 88,
          bestPractices: 90,
          seo: 82,
        },
      },
      'SEO-Keywords: ai search; brand visibility'
    );

    expect(signals.some((s) => s.id === 'geo-vs-market')).toBe(true);
    expect(signals.some((s) => s.id === 'geo-psi-seo')).toBe(true);
    expect(signals.some((s) => s.category === 'Quervergleich')).toBe(true);
  });

  it('builds playbook spread signal', () => {
    const signals = buildPlaybookCrossSignals({
      ok: true,
      playbookId: 'website_audit',
      playbookLabel: 'Website-Audit',
      url: 'https://example.com',
      outcomes: [
        {
          stepId: 'pagespeed',
          kind: 'pagespeed_check',
          label: 'PageSpeed',
          status: 'done',
          payload: {
            kind: 'pagespeed_check',
            data: { url: 'https://example.com', performance: 90, accessibility: 85, bestPractices: 88, seo: 80 },
          },
        },
        {
          stepId: 'quick_scan',
          kind: 'quick_scan',
          label: 'Scan',
          status: 'done',
          payload: {
            kind: 'quick_scan',
            data: {
              id: 'scan-1',
              url: 'https://example.com',
              score: 55,
              stats: { errors: 4, warnings: 2, notices: 0, total: 6 },
              issues: [],
            },
          },
        },
      ],
      steps: [],
    });
    expect(signals.some((s) => s.id === 'playbook-spread')).toBe(true);
  });

  it('builds domain and ssl cross signals', () => {
    const domain = buildDomainScanCrossSignals({
      id: 'd1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'complete',
      totalPages: 40,
      score: 58,
      stats: { errors: 5, warnings: 2, notices: 0, total: 7 },
      topIssues: [{ title: 'Missing alt', count: 8 }],
    });
    expect(domain.some((s) => s.id === 'domain-top-issue')).toBe(true);

    const ssl = buildSslCrossSignals({ host: 'example.com', grade: 'C', status: 'READY' });
    expect(ssl.some((s) => s.id === 'ssl-grade')).toBe(true);

    const readability = buildReadabilityCrossSignals({
      url: 'https://example.com',
      score: 13,
      grade: 'schwer',
      stats: { sentences: 20, words: 500, syllables: 800 },
    });
    expect(readability.some((s) => s.id === 'readability-hard')).toBe(true);
  });

  it('suggests continuation after weak geo', () => {
    const signals = buildGeoCrossSignals({
      jobId: 'j1',
      url: 'https://example.com',
      status: 'complete',
      overallScore: 50,
      competitors: [{ name: 'Rival', score: 80 }],
      keywords: [],
    });
    const followUps = buildWorkflowFollowUps({
      workflowType: 'geo_analysis',
      url: 'https://example.com',
      crossSignals: signals,
    });
    expect(followUps.some((f) => f.id === 'next-pagespeed')).toBe(true);
    expect(followUps.some((f) => f.prompt.includes('ohne GEO'))).toBe(true);
  });
});

describe('appendInsightBlocksToLayout', () => {
  it('appends analyst blocks after data blocks', () => {
    const dataLayout = {
      version: UI_LAYOUT_VERSION,
      blocks: [
        {
          id: 'data-1',
          type: 'metric_grid' as const,
          props: { title: 'Scan', items: [{ label: 'Score', value: 80 }] },
        },
      ],
    }
    const narrative = narrativeFromCrossSignals(
      [
        {
          id: 'x',
          category: 'GEO',
          severity: 'warning',
          title: 'Test',
          fact: 'Fact line',
        },
      ],
      'GEO',
    )
    const out = appendInsightBlocksToLayout(dataLayout, narrative)
    expect(out.blocks.length).toBeGreaterThan(dataLayout.blocks.length)
    expect(out.blocks.some((b) => b.type === 'finding_list')).toBe(true)
    expect(out.blocks.some((b) => b.type === 'recommendation_list' || b.type === 'alert')).toBe(
      true,
    )
  })
})

describe('EQC insight quality', () => {
  it('marks persona/traits/questions as context and keeps competitive signals as findings', () => {
    const signals = buildEventQuickCheckCrossSignals({
      ok: true,
      url: 'https://www.muenchener-verein.de/',
      playbookId: 'event_quick_check',
      playbookLabel: 'Quick Check',
      projectName: 'Demo',
      outcomes: [],
      steps: [],
      domainScan: {
        id: 'd1',
        domain: 'muenchener-verein.de',
        url: 'https://www.muenchener-verein.de/',
        status: 'complete',
        totalPages: 20,
        score: 70,
        stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
        topIssues: [{ title: 'Alt text', count: 4 }],
      },
      geoJob: {
        jobId: 'g1',
        url: 'https://www.muenchener-verein.de/',
        status: 'complete',
        overallScore: 62,
        geoFitnessScore: 55,
        eeatScores: {
          trust: { score: 40 },
          experience: { score: 70 },
          expertise: { score: 65 },
          authoritativeness: { score: 60 },
        },
        missingGeoElements: ['FAQs', 'Author'],
        competitors: [
          { name: 'muenchener-verein.de', score: 62, shareOfVoice: 0.46 },
          { name: 'allianz.de', score: 80, shareOfVoice: 0.62 },
        ],
      },
      personaPreview: {
        projectId: 'p1',
        projectName: 'Demo',
        targetGroupId: 'tg1',
        targetGroupName: 'TG',
        persona: {
          id: 'per1',
          name: 'Svenja',
          segment: 'Vergleicherin',
          confidence: 0.75,
          headline: 'Kurz',
          profile: {
            traits: [{ name: 'pragmatic', displayName: 'Pragmatisch', score: 0.82 }],
            goals: ['Zahnschutz planen'],
            painPoints: ['Unklare Tarife'],
          },
        },
      },
      geoQuestions: ['Welche Zahnzusatzversicherung lohnt sich?'],
    })

    expect(signals.some((s) => s.id === 'quick-persona' && isEqcMetaSignal(s))).toBe(true)
    expect(signals.some((s) => s.id === 'quick-persona-traits' && isEqcMetaSignal(s))).toBe(true)
    expect(signals.some((s) => s.id === 'quick-geo-questions' && isEqcMetaSignal(s))).toBe(true)
    expect(signals.some((s) => s.id === 'quick-eeat-spread')).toBe(true)
    expect(signals.some((s) => s.id === 'quick-domain-geo')).toBe(true)

    const narrative = narrativeFromEqcCrossSignals(signals, 'Quick Check')
    expect(narrative.findings.every((f) => !isEqcMetaFindingTitle(f.title))).toBe(true)
    expect(narrative.findings.some((f) => f.title === 'AUDION Persona')).toBe(false)
    expect(narrative.findings.some((f) => f.title === 'Top-Traits')).toBe(false)
    expect(narrative.findings.length).toBeGreaterThan(0)
  })

  it('filters legacy meta finding titles', () => {
    expect(
      filterEqcMetaFindings([
        { title: 'Top-Traits', description: 'x' },
        { title: 'Share-of-Voice-Abstand', description: 'y' },
        { title: 'AUDION Persona Svenja', description: 'z' },
      ]).map((f) => f.title),
    ).toEqual(['Share-of-Voice-Abstand'])
  })
})
