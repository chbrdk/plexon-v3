/**
 * Specialist → Collection Flow handoff recommendations.
 * Spec: specs/domain/assistant-domain-specialists.md § Flow handoff
 */

import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';
import { isAssistantSpecialistId } from '@/lib/assistant/specialists/types';

/** Planner intents where durable / multi-step work should prefer Collection Flow. */
export const FLOW_HANDOFF_SPECIALIST_INTENTS = [
  'checkion_scan',
  'checkion_seo_geo',
  'checkion_journey',
  'echon_market',
  'echon_audience',
  'videon_media',
  'audion_ux_journey',
  'metron_analytics',
] as const;

export type FlowHandoffSpecialistIntent = (typeof FLOW_HANDOFF_SPECIALIST_INTENTS)[number];

const LONG_JOB_PROMPT_PATTERNS = [
  /\bdeep[\s_-]?scan\b/i,
  /\bdomain[\s_-]?scan\b/i,
  /\b(500|1000|\d{3,})\s*(seiten|pages|urls)\b/i,
  /\bresearch[_ ]?run\b/i,
  /\banalysis[_ ]?run\b/i,
  /\bexport[_ ]?run\b/i,
  /\bbatch\b/i,
  /\blange\s+lauf/i,
  /\bovernight\b/i,
  /\bals\s+(collection[\s_-]?)?flow\b/i,
  /\bim\s+flow\s+(ausführ|starten|laufen)/i,
  /\bdauerhaft\b/i,
];

export function isFlowHandoffSpecialistIntent(
  intent: string | null | undefined,
): intent is FlowHandoffSpecialistIntent {
  return Boolean(intent && (FLOW_HANDOFF_SPECIALIST_INTENTS as readonly string[]).includes(intent));
}

export function promptSuggestsLongJob(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;
  return LONG_JOB_PROMPT_PATTERNS.some((p) => p.test(text));
}

/**
 * Follow-ups that route the user onto C2/C3 Collection Flow surfaces.
 * Only when a Collection is bound — otherwise Flow list/start cannot resolve.
 */
export function buildSpecialistFlowHandoffRecommendations(input: {
  plannerIntent?: string | null;
  specialistId?: string | null;
  platformProjectId?: string | null;
}): ConversationRecommendation[] {
  const intent = input.specialistId || input.plannerIntent || '';
  if (!input.platformProjectId?.trim()) return [];
  if (!isAssistantSpecialistId(intent)) return [];

  const out: ConversationRecommendation[] = [
    {
      id: 'flow-handoff-list',
      label: 'Flows zeigen',
      prompt: 'Zeige die Flows',
      reason: 'Bestehende Collection Flows auflisten und starten',
    },
    {
      id: 'flow-handoff-promote',
      label: 'Als Flow speichern',
      prompt: 'Als Flow speichern',
      reason: 'Dieses Chat-Rezept dauerhaft als Collection Flow ablegen',
    },
  ];

  if (isFlowHandoffSpecialistIntent(intent)) {
    out.unshift({
      id: 'flow-handoff-run',
      label: 'Flow starten',
      prompt: 'Starte den Collection Flow',
      reason: 'Lange Jobs im Flow ausführen (trigger: assistant)',
    });
  }

  return out.slice(0, 3);
}

/** System-prompt hint when a specialist turn looks like a durable job. */
export function buildFlowHandoffSystemHint(input: {
  specialistLabel: string;
  prompt: string;
}): string | null {
  if (!promptSuggestsLongJob(input.prompt)) return null;
  return [
    `## Flow-Handoff (${input.specialistLabel})`,
    'Lange oder wiederholbare Jobs gehören in **Collection Flow** (Chat-Trigger `assistant`), nicht in endlose synchrone Tool-Runden.',
    '- Bestehenden Flow: Nutzer kann „Zeige die Flows“ / „Flow starten“ sagen.',
    '- Chat-Rezept speichern: „Als Flow speichern“ (Promote → neuer Flow-Draft).',
    '- Deep-Scans / Research-Runs / Media-Exports: Status kurz melden und auf Flow/Playbook verweisen, statt alles im Chat zu Ende zu erzwingen.',
  ].join('\n');
}
