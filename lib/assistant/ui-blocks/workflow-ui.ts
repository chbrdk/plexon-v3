import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID } from '@/lib/assistant/ui-constants';
import type { UiBlock, UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export const PARALLEL_RESEARCH_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'bindings', label: 'Produkt-IDs laden', status: 'pending' },
  { id: 'checkion_research', label: 'CHECKION Research', status: 'pending' },
  { id: 'audion_research', label: 'AUDION Research', status: 'pending' },
];

export const CREATE_PRODUCT_PROJECT_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate', label: 'Eingaben prüfen', status: 'pending' },
  { id: 'create', label: 'Projekt anlegen', status: 'pending' },
  { id: 'done', label: 'Fertig', status: 'pending' },
];

export const QUICK_SCAN_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_url', label: 'URL prüfen', status: 'pending' },
  { id: 'run_scan', label: 'Scan ausführen', status: 'pending' },
  { id: 'aggregate', label: 'Ergebnis aufbereiten', status: 'pending' },
];

export const PAGESPEED_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_url', label: 'URL prüfen', status: 'pending' },
  { id: 'fetch', label: 'PageSpeed abrufen', status: 'pending' },
];

export const PERSONA_BOOTSTRAP_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'project', label: 'AUDION-Projekt', status: 'pending' },
  { id: 'target_group', label: 'Zielgruppe anlegen', status: 'pending' },
  { id: 'persona_generate', label: 'Persona generieren', status: 'pending' },
];

export const JOURNEY_OUTLINE_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'resolve', label: 'Journey ermitteln', status: 'pending' },
  { id: 'fetch', label: 'Detail laden', status: 'pending' },
  { id: 'validate', label: 'Validate', status: 'pending' },
  { id: 'compose', label: 'UI aufbauen', status: 'pending' },
];

export const SYNC_DIAGNOSE_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'checkion_probe', label: 'CHECKION erreichbar?', status: 'pending' },
  { id: 'audion_probe', label: 'AUDION erreichbar?', status: 'pending' },
  { id: 'bindings', label: 'Bindings prüfen', status: 'pending' },
  { id: 'retry', label: 'Sync-Retry', status: 'pending' },
];

export const GEO_ANALYSIS_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'prepare', label: 'Vorbereitung', status: 'pending' },
  { id: 'start_job', label: 'Analyse starten', status: 'pending' },
  { id: 'run_analysis', label: 'GEO/E-E-A-T Analyse', status: 'pending' },
  { id: 'aggregate', label: 'Ergebnis aufbereiten', status: 'pending' },
];

export const SSL_CHECK_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_host', label: 'Host prüfen', status: 'pending' },
  { id: 'fetch', label: 'SSL-Grade abrufen', status: 'pending' },
];

export const WAYBACK_CHECK_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_url', label: 'URL prüfen', status: 'pending' },
  { id: 'fetch', label: 'Wayback-Archiv abrufen', status: 'pending' },
];

export const DOMAIN_SCAN_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_url', label: 'URL prüfen', status: 'pending' },
  { id: 'start_scan', label: 'Domain-Scan starten', status: 'pending' },
  { id: 'poll_scan', label: 'Seiten crawlen', status: 'pending' },
  { id: 'aggregate', label: 'Ergebnis aufbereiten', status: 'pending' },
];

export const CONTRAST_CHECK_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_colors', label: 'Farben prüfen', status: 'pending' },
  { id: 'fetch', label: 'Kontrast berechnen', status: 'pending' },
];

export const READABILITY_CHECK_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'validate_url', label: 'URL prüfen', status: 'pending' },
  { id: 'extract', label: 'Text extrahieren', status: 'pending' },
  { id: 'analyze', label: 'Lesbarkeit analysieren', status: 'pending' },
];

export const SCAN_SUMMARIZE_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'resolve_scan', label: 'Scan-ID ermitteln', status: 'pending' },
  { id: 'summarize', label: 'LLM-Zusammenfassung', status: 'pending' },
];

export const QUICK_SCAN_SUMMARIZE_STEP: WorkflowStep = {
  id: 'summarize',
  label: 'Zusammenfassung erstellen',
  status: 'pending',
};

export const PLAYBOOK_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'prepare', label: 'Playbook vorbereiten', status: 'pending' },
  { id: 'run_steps', label: 'Schritte ausführen', status: 'pending' },
  { id: 'aggregate', label: 'Report erstellen', status: 'pending' },
];

export function workflowStepListTitle(workflowType?: string): string {
  if (workflowType === 'parallel_research') return 'Research';
  if (workflowType === 'create_platform_project') return 'Projekt anlegen';
  if (workflowType === 'create_audion_project' || workflowType === 'create_checkion_project') {
    return 'Projekt anlegen';
  }
  if (workflowType === 'quick_scan') return 'Accessibility-Scan';
  if (workflowType === 'pagespeed_check') return 'PageSpeed';
  if (workflowType === 'persona_bootstrap') return 'Persona-Bootstrap';
  if (workflowType === 'journey_outline') return 'Journey Outline';
  if (workflowType === 'sync_diagnose') return 'Sync-Diagnose';
  if (workflowType === 'geo_analysis') return 'GEO / E-E-A-T';
  if (workflowType === 'ssl_check') return 'SSL-Check';
  if (workflowType === 'wayback_check') return 'Wayback';
  if (workflowType === 'domain_scan') return 'Domain Deep Scan';
  if (workflowType === 'contrast_check') return 'Kontrast-Check';
  if (workflowType === 'readability_check') return 'Lesbarkeit';
  if (workflowType === 'scan_summarize') return 'Scan-Zusammenfassung';
  if (workflowType === 'website_audit') return 'Website-Audit';
  if (workflowType === 'launch_readiness') return 'Launch Readiness';
  if (workflowType === 'event_quick_check') return QUICK_CHECK_LABEL;
  return 'Workflow';
}

export function buildWorkflowStepListBlock(
  steps: WorkflowStep[],
  title?: string,
  blockId = ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID
): UiBlock {
  return {
    id: blockId,
    type: 'step_list',
    props: {
      title,
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        detail: s.detail,
        progress: s.progress,
      })),
    },
  };
}

export function upsertStepListInLayout(
  layout: UiLayout | undefined,
  steps: WorkflowStep[],
  title?: string,
  blockId = ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID
): UiLayout {
  const block = buildWorkflowStepListBlock(steps, title, blockId);
  const blocks = [...(layout?.blocks ?? [])];
  const idx = blocks.findIndex((b) => b.id === blockId || b.type === 'step_list');
  if (idx >= 0) {
    blocks[idx] = block;
  } else {
    blocks.push(block);
  }
  return {
    version: UI_LAYOUT_VERSION,
    blocks,
    panel: layout?.panel,
  };
}

export function metadataWithWorkflowSteps(
  base: Record<string, unknown>,
  steps: WorkflowStep[],
  title?: string
): Record<string, unknown> {
  const workflowType = typeof base.workflowType === 'string' ? base.workflowType : undefined;
  const uiLayout = upsertStepListInLayout(
    base.uiLayout as UiLayout | undefined,
    steps,
    title ?? workflowStepListTitle(workflowType)
  );
  return {
    ...base,
    workflowSteps: steps,
    contentType: 'ui_composed',
    uiLayout,
  };
}

/** Server-side builder with Zod validation (random id when blockId omitted). */
export function buildStepListBlock(
  steps: WorkflowStep[],
  title?: string,
  blockId?: string
): { ok: true; block: UiBlock } | { ok: false; error: string } {
  return createUiBlock(
    'step_list',
    {
      title,
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        detail: s.detail,
        progress: s.progress,
      })),
    },
    blockId ?? ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID
  );
}
