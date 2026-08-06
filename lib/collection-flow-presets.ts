/**
 * Palette presets for Journey + Quality product nodes (Waves 11 / 13).
 * Presets still emit closed kinds — no new agent kinds / no free expressions.
 * @see specs/domain/collection-test-flow.md
 */

import {
  DEFAULT_SCORE_GATE_THRESHOLD,
  type CollectionFlowNode,
  type CollectionFlowNodeKind,
} from '@/lib/collection-test-flow';

export type CollectionFlowPresetGroup =
  | 'kontext'
  | 'schritte'
  | 'messung'
  | 'steuerung'
  | 'qualität'
  | 'vergleich'
  | 'eqc';

export type CollectionFlowPreset = {
  id: string;
  group: CollectionFlowPresetGroup;
  /** Palette button label. */
  label: string;
  kind: CollectionFlowNodeKind;
  defaults: Partial<CollectionFlowNode>;
};

export const COLLECTION_MEASURE_KEY_OPTIONS = [
  'ease',
  'findability',
  'clarity',
  'usefulness',
  'likelihood',
  'overall',
] as const;

export type CollectionMeasureKey = (typeof COLLECTION_MEASURE_KEY_OPTIONS)[number];

export const COLLECTION_FLOW_PRESETS: CollectionFlowPreset[] = [
  {
    id: 'zielgruppe',
    group: 'kontext',
    label: 'Zielgruppe',
    kind: 'zielgruppe',
    defaults: { label: 'Zielgruppe' },
  },
  {
    id: 'persona',
    group: 'kontext',
    label: 'Persona',
    kind: 'persona',
    defaults: { label: 'Persona' },
  },
  {
    id: 'start',
    group: 'kontext',
    label: 'Start',
    kind: 'start',
    defaults: { label: 'Start', url: '', urlKey: '', maxSteps: 8 },
  },
  {
    id: 'prompt',
    group: 'schritte',
    label: 'Aufgabe',
    kind: 'prompt',
    defaults: { label: 'Aufgabe', text: '' },
  },
  {
    id: 'observe',
    group: 'schritte',
    label: 'Beobachten',
    kind: 'observe',
    defaults: { label: 'Beobachten', text: 'Schau dich kurz um.', observeSeconds: 30 },
  },
  {
    id: 'action-orientieren',
    group: 'schritte',
    label: 'Action: Orientieren',
    kind: 'action',
    defaults: {
      label: 'Orientieren',
      presetId: 'action-orientieren',
      text: 'Orientiere dich auf der Seite und finde einen klaren nächsten Schritt. Denke laut.',
    },
  },
  {
    id: 'action-suchen',
    group: 'schritte',
    label: 'Action: Suchfeld',
    kind: 'action',
    defaults: {
      label: 'Suchfeld nutzen',
      presetId: 'action-suchen',
      text: 'Finde das Suchfeld, gib einen passenden Begriff ein und starte die Suche.',
    },
  },
  {
    id: 'action-navigieren',
    group: 'schritte',
    label: 'Action: Navigation',
    kind: 'action',
    defaults: {
      label: 'Navigation',
      presetId: 'action-navigieren',
      text: 'Nutze die Hauptnavigation, um den relevanten Bereich zu öffnen.',
    },
  },
  {
    id: 'action-filter',
    group: 'schritte',
    label: 'Action: Filter',
    kind: 'action',
    defaults: {
      label: 'Filter öffnen',
      presetId: 'action-filter',
      text: 'Öffne die Filter und setze eine sinnvolle Einschränkung.',
    },
  },
  {
    id: 'action-formular',
    group: 'schritte',
    label: 'Action: Formular',
    kind: 'action',
    defaults: {
      label: 'Formular',
      presetId: 'action-formular',
      text: 'Fülle die sichtbaren Pflichtfelder aus und sende das Formular ab, wenn möglich.',
    },
  },
  {
    id: 'frage-ease',
    group: 'messung',
    label: 'Frage: Ease',
    kind: 'measure',
    defaults: {
      label: 'Ease',
      presetId: 'frage-ease',
      measureKey: 'ease',
      text: 'Wie leicht war es, die Aufgabe zu erledigen? (1–7)',
    },
  },
  {
    id: 'frage-overall',
    group: 'messung',
    label: 'Frage: Overall',
    kind: 'measure',
    defaults: {
      label: 'Overall',
      presetId: 'frage-overall',
      measureKey: 'overall',
      text: 'Wie bewertest du die Erfahrung insgesamt? (1–7)',
    },
  },
  {
    id: 'frage-findability',
    group: 'messung',
    label: 'Frage: Findability',
    kind: 'measure',
    defaults: {
      label: 'Findability',
      presetId: 'frage-findability',
      measureKey: 'findability',
      text: 'Wie leicht hast du gefunden, wonach du gesucht hast? (1–7)',
    },
  },
  {
    id: 'gate',
    group: 'steuerung',
    label: 'Gate',
    kind: 'gate',
    defaults: { label: 'Gate', gateCondition: 'goal_reached' },
  },
  {
    id: 'message',
    group: 'steuerung',
    label: 'Nachricht',
    kind: 'message',
    defaults: { label: 'Nachricht', text: '' },
  },
  {
    id: 'success',
    group: 'steuerung',
    label: 'Success',
    kind: 'success',
    defaults: { label: 'Success', text: '' },
  },
  {
    id: 'abandon',
    group: 'steuerung',
    label: 'Abandon',
    kind: 'abandon',
    defaults: { label: 'Abandon', text: '' },
  },
  // Wave 13 — Quality / Compare
  {
    id: 'scan',
    group: 'qualität',
    label: 'Page Scan',
    kind: 'scan',
    defaults: { label: 'Page scan', scanMode: 'single', presetId: 'scan' },
  },
  {
    id: 'domain_scan',
    group: 'qualität',
    label: 'Domain Scan',
    kind: 'domain_scan',
    defaults: { label: 'Domain Scan', presetId: 'domain_scan' },
  },
  {
    id: 'geo_job',
    group: 'qualität',
    label: 'GEO Job',
    kind: 'geo_job',
    defaults: { label: 'GEO Job', presetId: 'geo_job' },
  },
  {
    id: 'quality_ok',
    group: 'qualität',
    label: 'Quality OK',
    kind: 'quality_ok',
    defaults: { label: 'Quality OK', presetId: 'quality_ok' },
  },
  {
    id: 'compare-score-70',
    group: 'vergleich',
    label: `Compare: Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
    kind: 'compare',
    defaults: {
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      presetId: 'compare-score-70',
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
    },
  },
  {
    id: 'compare-a11y',
    group: 'vergleich',
    label: 'Compare: A11y ≥ 70',
    kind: 'compare',
    defaults: {
      label: 'A11y ≥ 70',
      presetId: 'compare-a11y',
      path: 'scan.scores.accessibility',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
    },
  },
  {
    id: 'compare-no-critical',
    group: 'vergleich',
    label: 'Compare: keine Criticals',
    kind: 'compare',
    defaults: {
      label: 'Keine Criticals',
      presetId: 'compare-no-critical',
      path: 'scan.issues.criticalCount',
      op: 'eq',
      value: 0,
    },
  },
  {
    id: 'compare-journey-done',
    group: 'vergleich',
    label: 'Compare: Journey done',
    kind: 'compare',
    defaults: {
      label: 'Journey done',
      presetId: 'compare-journey-done',
      path: 'journey.taskCompleted',
      op: 'eq',
      value: true,
    },
  },
  {
    id: 'compare-geo-cited',
    group: 'vergleich',
    label: 'Compare: GEO cited ≥ 70',
    kind: 'compare',
    defaults: {
      label: 'GEO cited ≥ 70',
      presetId: 'compare-geo-cited',
      path: 'geo.citedShare',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
    },
  },
  {
    id: 'set-alias',
    group: 'vergleich',
    label: 'Set (Alias)',
    kind: 'set',
    defaults: {
      label: 'Set',
      alias: 'score',
      path: 'scan.overallScore',
      presetId: 'set-alias',
    },
  },
  {
    id: 'eqc-research-brief',
    group: 'eqc',
    label: 'Unternehmensprofil',
    kind: 'research_brief',
    defaults: { label: 'Unternehmensprofil', presetId: 'eqc-research-brief' },
  },
  {
    id: 'eqc-confirm-brief',
    group: 'eqc',
    label: 'Bestätigen: Profil',
    kind: 'human_confirm',
    defaults: {
      label: 'Profil bestätigen',
      confirmKind: 'brief',
      presetId: 'eqc-confirm-brief',
    },
  },
  {
    id: 'eqc-competitors',
    group: 'eqc',
    label: 'Wettbewerber',
    kind: 'competitors_suggest',
    defaults: { label: 'Wettbewerber', presetId: 'eqc-competitors' },
  },
  {
    id: 'eqc-persona-boot',
    group: 'eqc',
    label: 'Persona erstellen',
    kind: 'persona_bootstrap',
    defaults: { label: 'Persona erstellen', presetId: 'eqc-persona-boot' },
  },
  {
    id: 'eqc-suggest-queries',
    group: 'eqc',
    label: 'GEO-Fragen',
    kind: 'suggest_queries',
    defaults: { label: 'GEO-Fragen', presetId: 'eqc-suggest-queries' },
  },
  {
    id: 'eqc-confirm-geo',
    group: 'eqc',
    label: 'Bestätigen: GEO',
    kind: 'human_confirm',
    defaults: {
      label: 'GEO-Fragen bestätigen',
      confirmKind: 'geo_queries',
      presetId: 'eqc-confirm-geo',
    },
  },
];

export const PALETTE_JOURNEY_GROUPS: Array<{
  id: CollectionFlowPresetGroup;
  title: string;
  presets: CollectionFlowPreset[];
}> = (['kontext', 'schritte', 'messung', 'steuerung'] as const).map((id) => ({
  id,
  title:
    id === 'kontext'
      ? 'Kontext'
      : id === 'schritte'
        ? 'Schritte'
        : id === 'messung'
          ? 'Messung'
          : 'Steuerung',
  presets: COLLECTION_FLOW_PRESETS.filter((p) => p.group === id),
}));

export const PALETTE_QUALITY_GROUPS: Array<{
  id: CollectionFlowPresetGroup;
  title: string;
  presets: CollectionFlowPreset[];
}> = (
  [
    { id: 'qualität' as const, title: 'Qualität' },
    { id: 'vergleich' as const, title: 'Vergleich' },
    { id: 'eqc' as const, title: 'Quick Check' },
  ] as const
).map(({ id, title }) => ({
  id,
  title,
  presets: COLLECTION_FLOW_PRESETS.filter((p) => p.group === id),
}));

export function presetById(id: string): CollectionFlowPreset | undefined {
  return COLLECTION_FLOW_PRESETS.find((p) => p.id === id);
}
