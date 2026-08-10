/**
 * Display labels for Collection Flow node kinds (DE board chrome).
 * i18n keys under `projects.detail.flowKinds.*` mirror these for EN locale.
 */

import type { CollectionFlowNodeKind } from '@/lib/collection-test-flow';

export const COLLECTION_FLOW_KIND_LABEL: Record<CollectionFlowNodeKind, string> = {
  start: 'Start',
  prompt: 'Aufgabe',
  observe: 'Beobachten',
  action: 'Action',
  gate: 'Gate',
  message: 'Nachricht',
  success: 'Success',
  abandon: 'Abandon',
  measure: 'Frage',
  persona: 'Persona',
  zielgruppe: 'Zielgruppe',
  journey: 'Journey',
  scan: 'Scan',
  domain_scan: 'Domain Scan',
  geo_job: 'GEO Job',
  compare: 'Compare',
  set: 'Set',
  guideline: 'Guideline',
  brand_measure: 'Brand Measure',
  research_brief: 'Unternehmensprofil',
  competitors_suggest: 'Wettbewerber',
  persona_bootstrap: 'Persona erstellen',
  suggest_queries: 'GEO-Fragen',
  human_confirm: 'Bestätigen',
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
  geo_gate: 'GEO Gate',
  quality_ok: 'Quality OK',
};
