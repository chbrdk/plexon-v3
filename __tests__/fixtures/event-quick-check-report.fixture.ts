import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { WorkflowInsightNarrative } from '@/lib/assistant/insights/types';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';

/** Anonymized bvik.org-style quick check result for report template tests. */
export function eventQuickCheckBvikFixture(): EventQuickCheckResult {
  return {
    ok: true,
    playbookId: 'event_quick_check',
    playbookLabel: QUICK_CHECK_LABEL,
    projectName: 'bvik.org',
    url: 'https://bvik.org',
    platformProjectId: 'pp-bvik-1',
    dashboardPath: '/projects/pp-bvik-1',
    outcomes: [
      { stepId: 'create_project', label: 'Plattform-Projekt', status: 'done', data: { platformProjectId: 'pp-bvik-1' } },
      { stepId: 'ensure_audion', label: 'AUDION-Projekt einrichten', status: 'done', data: { audionProjectId: 'audion-1' } },
      { stepId: 'parallel_research', label: 'Research', status: 'done' },
      {
        stepId: 'domain_scan',
        label: 'Domain-Scan (50 Seiten)',
        status: 'done',
        data: { scanId: 'scan-bvik-1' },
      },
      { stepId: 'persona_bootstrap', label: 'AUDION Persona', status: 'done' },
      {
        stepId: 'geo_questions',
        label: 'GEO-Fragen',
        status: 'done',
        data: { questions: ['Welche Verbände für Bau und Immobilien? (Elena)'] },
      },
      {
        stepId: 'geo_check',
        label: 'GEO Competitive Check',
        status: 'error',
        error: 'Navigation timeout of 60000 ms exceeded',
      },
    ],
    steps: [],
    geoQuestions: [
      'Welche sind die besten Verbände für die Bau- und Immobilienwirtschaft? (Elena)',
      'Top Netzwerke im Bereich Bau- und Immobilienwirtschaft (Elena)',
      'BVIK ähnliche Organisationen: Verbände für Kaufleute (Elena)',
    ],
    personaPreview: {
      projectId: 'audion-1',
      projectName: 'bvik.org',
      targetGroupId: 'tg-1',
      targetGroupName: 'bvik.org',
      persona: {
        id: 'persona-elena',
        name: 'Elena',
        segment: 'bvik.org',
        confidence: 0.81,
        headline: 'Operations Director driving digital transformation',
        profile: {
          traits: [
            { name: 'pragmatic', score: 0.88 },
            { name: 'analytical', score: 0.85 },
            { name: 'detail_oriented', score: 0.82 },
          ],
          goals: [
            { label: 'Stay informed on sector trends', priority: 1 },
            { label: 'Find practical B2B solutions', priority: 2 },
          ] as unknown as string[],
          painPoints: [
            { label: 'Long procurement cycles', evidence_count: 1 },
            { label: 'Opaque vendor pricing', evidence_count: 1 },
          ] as unknown as string[],
          bio: 'Operations director at a mid-sized industrial distributor.',
          interests: ['B2B technology solutions', 'Industry digitalization'],
        },
      },
    },
    domainScan: {
      id: 'scan-bvik-1',
      domain: 'bvik.org',
      url: 'https://bvik.org',
      status: 'complete',
      totalPages: 50,
      score: 57,
      stats: { errors: 213, warnings: 0, notices: 0, total: 213 },
      topIssues: [
        {
          title:
            'This form does not contain a submit button, which creates issues for those who cannot submit the form using the keyboard.',
          count: 50,
        },
        { title: 'Img element with empty alt text must have absent or empty title attribute.', count: 49 },
      ],
    },
    geoJob: undefined,
    audionProjectId: 'audion-1',
    audionSetupRequired: false,
    checkionOnly: false,
  };
}

export function eventQuickCheckBvikNarrativeFixture(): WorkflowInsightNarrative {
  return {
    assessment:
      'bvik.org erzielt 57/100 mit 213 Accessibility-Fehlern auf 50 Seiten. Elena (81 % Confidence) erwartet professionelle digitale Qualität.',
    fazit: 'Priorität: Template-Level A11y-Fixes, dann GEO-Sichtbarkeit stärken.',
    fazitTone: 'warning',
    findings: [
      {
        title: 'Fehlende Submit-Buttons',
        description: '50/50 Seiten betroffen — systemisches Template-Problem.',
        severity: 'error',
      },
    ],
    recommendations: [
      {
        title: 'Submit-Buttons in allen Formularen ergänzen',
        description: 'Template-Korrektur auf CMS-Ebene.',
        priority: 1,
        category: 'A11y',
      },
    ],
  };
}
