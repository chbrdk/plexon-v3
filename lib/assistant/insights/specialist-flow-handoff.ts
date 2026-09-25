/**
 * Specialist → Collection Flow handoff recommendations.
 * Spec: specs/domain/assistant-domain-specialists.md § Flow handoff
 */

import type { ConversationMessageWithMeta } from '@/lib/assistant/conversation-context';
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

/** Name/template token hints used to auto-pick a Collection Flow after a specialist turn. */
export const SPECIALIST_FLOW_NAME_HINTS: Record<FlowHandoffSpecialistIntent, string[]> = {
  checkion_scan: ['scan', 'deep', 'domain', 'quick', 'accessibility', 'wcag', 'a11y', 'page'],
  checkion_seo_geo: ['geo', 'seo', 'e-e-a-t', 'eeat', 'e-e-a', 'trust'],
  checkion_journey: ['journey', 'ux', 'path', 'funnel'],
  echon_market: ['market', 'research', 'signal', 'echon', 'competitor'],
  echon_audience: ['audience', 'segment', 'zielgruppe', 'cohort'],
  videon_media: ['video', 'videon', 'media', 'export', 'cut', 'clip', 'reframe'],
  audion_ux_journey: ['journey', 'ux', 'audion', 'persona', 'path'],
  metron_analytics: ['metron', 'kpi', 'dashboard', 'analytics', 'metric'],
};

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

export type AssistantFlowPickItem = {
  id: string;
  name: string;
  templateId?: string | null;
};

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
 * Prefer a Collection Flow whose name/template matches the last specialist domain.
 * Returns null when ambiguous or no hints match (caller falls back to list UX).
 */
export function resolvePreferredFlowForSpecialist(
  specialistIntent: string | null | undefined,
  flows: AssistantFlowPickItem[],
): AssistantFlowPickItem | null {
  if (!flows.length) return null;
  if (flows.length === 1) return flows[0]!;

  if (!isFlowHandoffSpecialistIntent(specialistIntent)) return null;
  const hints = SPECIALIST_FLOW_NAME_HINTS[specialistIntent];
  if (!hints?.length) return null;

  const scored = flows
    .map((flow) => {
      const hay = `${flow.name} ${flow.templateId ?? ''}`.toLowerCase();
      const score = hints.reduce((sum, hint) => (hay.includes(hint.toLowerCase()) ? sum + 1 : sum), 0);
      return { flow, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.flow.name.localeCompare(b.flow.name));

  if (!scored.length) return null;
  if (scored.length === 1) return scored[0]!.flow;
  if (scored[0]!.score > scored[1]!.score) return scored[0]!.flow;
  return null;
}

/** Walk assistant history for the most recent planner specialist / intent. */
export function findLastSpecialistFromHistory(
  history: ConversationMessageWithMeta[] | null | undefined,
): string | null {
  if (!history?.length) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg?.role !== 'assistant') continue;
    const planner = msg.metadata?.planner as
      | { intent?: string; specialistId?: string | null }
      | undefined;
    const id = (planner?.specialistId || planner?.intent || '').trim();
    if (id && isAssistantSpecialistId(id)) return id;
  }
  return null;
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
      reason: 'Lange Jobs im Flow ausführen (trigger: assistant); Specialist-Kontext wählt den Flow',
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
    '- Bestehenden Flow: Nutzer kann „Zeige die Flows“ / „Flow starten“ sagen — ohne Namen wird der passende Flow aus dem Specialist-Kontext gewählt.',
    '- Chat-Rezept speichern: „Als Flow speichern“ (Promote → neuer Flow-Draft).',
    '- Deep-Scans / Research-Runs / Media-Exports: Status kurz melden und auf Flow/Playbook verweisen, statt alles im Chat zu Ende zu erzwingen.',
  ].join('\n');
}
