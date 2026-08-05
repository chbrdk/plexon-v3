/**
 * Palette presets for Journey product nodes (Wave 11).
 * Presets still emit closed Audion kinds (`action` / `measure`) — no new agent kinds.
 * @see specs/domain/collection-test-flow.md
 */

import type { CollectionFlowNode, CollectionFlowNodeKind } from '@/lib/collection-test-flow';

export type CollectionFlowPreset = {
  id: string;
  group: 'kontext' | 'schritte' | 'messung' | 'steuerung';
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
];

export const PALETTE_JOURNEY_GROUPS: Array<{
  id: CollectionFlowPreset['group'];
  title: string;
  presets: CollectionFlowPreset[];
}> = (
  ['kontext', 'schritte', 'messung', 'steuerung'] as const
).map((id) => ({
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

export function presetById(id: string): CollectionFlowPreset | undefined {
  return COLLECTION_FLOW_PRESETS.find((p) => p.id === id);
}
