import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import {
  EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED,
  type EventQuickCheckDepth,
  resolveEventQuickCheckProfile,
} from '@/lib/paths/assistant-workflows';

const ECHON_STEP: WorkflowStep = {
  id: 'echon_market_research',
  label: 'ECHON Markt-Research',
  status: 'pending',
};

const COMPANY_BRIEF_STEPS: WorkflowStep[] = [
  { id: 'company_research', label: 'Unternehmen recherchieren', status: 'pending' },
  { id: 'company_brief_confirm', label: 'Unternehmensprofil bestätigen', status: 'pending' },
];

const COMPETITOR_STEPS: WorkflowStep[] = [
  { id: 'competitors_suggest', label: 'Wettbewerber vorschlagen', status: 'pending' },
  { id: 'competitors_confirm', label: 'Wettbewerber bestätigen', status: 'pending' },
];

function domainScanLabel(depth: EventQuickCheckDepth): string {
  const profile = resolveEventQuickCheckProfile(depth);
  if (profile.scanCompetitors) {
    return `Domain-Scan (${profile.scanMaxPages} Seiten + Wettbewerber)`;
  }
  return `Domain-Scan (${profile.scanMaxPages} Seiten)`;
}

function buildQuickCheckCoreSteps(depth: EventQuickCheckDepth): WorkflowStep[] {
  const profile = resolveEventQuickCheckProfile(depth);
  return [
    { id: 'prepare', label: 'URL & Projektname', status: 'pending' },
    ...COMPANY_BRIEF_STEPS,
    { id: 'create_project', label: 'Plattform-Projekt anlegen', status: 'pending' },
    { id: 'ensure_audion', label: 'AUDION & CHECKION verknüpfen', status: 'pending' },
    ...(profile.scanCompetitors ? COMPETITOR_STEPS : []),
    { id: 'domain_scan', label: domainScanLabel(depth), status: 'pending' },
    { id: 'parallel_research', label: 'Website-Research', status: 'pending' },
    { id: 'persona_bootstrap', label: 'AUDION Persona erstellen', status: 'pending' },
    { id: 'geo_questions', label: 'GEO-Fragen ableiten', status: 'pending' },
    { id: 'geo_questions_confirm', label: 'GEO-Fragen bestätigen', status: 'pending' },
    { id: 'geo_check', label: 'GEO / E-E-A-T Analyse', status: 'pending' },
    { id: 'aggregate', label: 'Report zusammenstellen', status: 'pending' },
  ];
}

export function buildEventQuickCheckInitialSteps(
  depth: EventQuickCheckDepth = 'quick'
): WorkflowStep[] {
  const steps = buildQuickCheckCoreSteps(depth).map((step) => ({ ...step }));
  if (!EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED) {
    return steps;
  }
  const createIdx = steps.findIndex((s) => s.id === 'create_project');
  return [
    ...steps.slice(0, createIdx),
    { ...ECHON_STEP },
    ...steps.slice(createIdx),
  ];
}

/** Initial workflow steps for a new Quick Check run (quick depth). */
export const EVENT_QUICK_CHECK_INITIAL_STEPS: WorkflowStep[] = buildEventQuickCheckInitialSteps('quick');

export const EVENT_QUICK_CHECK_STREAM_TITLE = QUICK_CHECK_LABEL;
