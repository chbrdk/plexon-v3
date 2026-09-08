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
  videon_media: 'Media',
  videon_analysis_run: 'Analysis',
  videon_cut_create: 'Cut',
  videon_export_run: 'Export',
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
