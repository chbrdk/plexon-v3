/**
 * Internal specialist registry (Wave 1–4).
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import type { AssistantPlanIntent } from '@/lib/assistant/assistant-planner';
import { JEV_USE_CASES } from '@/lib/jev/catalog';
import { scheduleJevShadow } from '@/lib/jev/schedule';
import { choiceQuestion, type JevQuestions } from '@/lib/jev/types';
import {
  AUDION_CHAT_FAMILIES,
  AUDION_DOCUMENTS_FAMILIES,
  AUDION_JOURNEY_FAMILIES,
  AUDION_KNOWLEDGE_FAMILIES,
  BRANDION_BRAND_FAMILIES,
  CHECKION_JOURNEY_FAMILIES,
  CREATION_DESIGN_FAMILIES,
  CREATION_SCENE_EDIT_FAMILIES,
  CREATION_SCENE_EDIT_WITH_SPIRION_FAMILIES,
  ECHON_MARKET_FAMILIES,
  ECHON_TO_AUDIENCE_FAMILIES,
  GEO_FAMILIES,
  METRON_ANALYTICS_FAMILIES,
  PERSONA_FAMILIES,
  SCAN_FAMILIES,
  SPIRION_RESEARCH_FAMILIES,
  UX_JOURNEY_FAMILIES,
  VIDEON_MEDIA_FAMILIES,
} from '@/lib/assistant/tool-catalog';
import { buildAudionIntegrationContextBlock } from '@/lib/integrations/audion-connectivity';
import { buildBrandionIntegrationContextBlock } from '@/lib/integrations/brandion-connectivity';
import { buildCreationIntegrationContextBlock } from '@/lib/integrations/creation-connectivity';
import { buildEchonIntegrationContextBlock } from '@/lib/integrations/echon-connectivity';
import { buildMetronIntegrationContextBlock } from '@/lib/integrations/metron-connectivity';
import { buildSpirionIntegrationContextBlock } from '@/lib/integrations/spirion-connectivity';
import { buildVideonIntegrationContextBlock } from '@/lib/integrations/videon-connectivity';
import { buildCheckionGeoSpecialistAddendum } from '@/lib/assistant/specialists/checkion-geo';
import { buildCheckionJourneySpecialistAddendum } from '@/lib/assistant/specialists/checkion-journey';
import { buildCheckionScanSpecialistAddendum } from '@/lib/assistant/specialists/checkion-scan';
import {
  isAssistantSpecialistId,
  type AssistantSpecialist,
  type AssistantSpecialistId,
} from '@/lib/assistant/specialists/types';

function withSpecialistHeader(label: string, body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith(`## Specialist:`)) return trimmed;
  return `## Specialist: ${label}\n\n${trimmed}`;
}

const METRON_SPECIALIST: AssistantSpecialist = {
  id: 'metron_analytics',
  label: 'Metron',
  toolFamilies: [...METRON_ANALYTICS_FAMILIES],
  maxToolRounds: 6,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Metron',
      buildMetronIntegrationContextBlock({ useMetronMcp: ctx.useMetronMcp }),
    ),
};

const CHECKION_SCAN_SPECIALIST: AssistantSpecialist = {
  id: 'checkion_scan',
  label: 'Checkion Scan',
  toolFamilies: [...SCAN_FAMILIES],
  maxToolRounds: 6,
  buildSystemAddendum: (ctx) =>
    buildCheckionScanSpecialistAddendum({ useCheckionMcp: ctx.useCheckionMcp }),
};

const CHECKION_GEO_SPECIALIST: AssistantSpecialist = {
  id: 'checkion_seo_geo',
  label: 'Checkion GEO',
  toolFamilies: [...GEO_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: (ctx) =>
    buildCheckionGeoSpecialistAddendum({ useCheckionMcp: ctx.useCheckionMcp }),
};

const CREATION_SCENE_SPECIALIST: AssistantSpecialist = {
  id: 'creation_scene_edit',
  label: 'Creation Scene',
  toolFamilies: [...CREATION_SCENE_EDIT_FAMILIES],
  maxToolRounds: 14,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Creation Scene',
      buildCreationIntegrationContextBlock({ useCreationMcp: ctx.useCreationMcp }),
    ),
};

const CREATION_DESIGN_SPECIALIST: AssistantSpecialist = {
  id: 'creation_design',
  label: 'Creation Design',
  toolFamilies: [...CREATION_DESIGN_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Creation Design',
      buildCreationIntegrationContextBlock({ useCreationMcp: ctx.useCreationMcp }),
    ),
};

const VIDEON_SPECIALIST: AssistantSpecialist = {
  id: 'videon_media',
  label: 'Videon',
  toolFamilies: [...VIDEON_MEDIA_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Videon',
      buildVideonIntegrationContextBlock({ useVideonMcp: ctx.useVideonMcp }),
    ),
};

const BRANDION_SPECIALIST: AssistantSpecialist = {
  id: 'brandion_brand',
  label: 'Brandion',
  toolFamilies: [...BRANDION_BRAND_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Brandion',
      buildBrandionIntegrationContextBlock({ useBrandionMcp: ctx.useBrandionMcp }),
    ),
};

const ECHON_SPECIALIST: AssistantSpecialist = {
  id: 'echon_market',
  label: 'Echon',
  toolFamilies: [...ECHON_MARKET_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Echon',
      await buildEchonIntegrationContextBlock({ useEchonMcp: ctx.useEchonMcp }),
    ),
};

const ECHON_AUDIENCE_SPECIALIST: AssistantSpecialist = {
  id: 'echon_audience',
  label: 'Echon Audience',
  toolFamilies: [...ECHON_TO_AUDIENCE_FAMILIES],
  maxToolRounds: 6,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Echon Audience',
      [
        await buildEchonIntegrationContextBlock({ useEchonMcp: ctx.useEchonMcp }),
        await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
      ].join('\n\n'),
    ),
};

const AUDION_PERSONA_SPECIALIST: AssistantSpecialist = {
  id: 'audion_persona',
  label: 'Audion Persona',
  toolFamilies: [...PERSONA_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion Persona',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const AUDION_UX_JOURNEY_SPECIALIST: AssistantSpecialist = {
  id: 'audion_ux_journey',
  label: 'Audion UX Journey',
  toolFamilies: [...UX_JOURNEY_FAMILIES],
  maxToolRounds: 6,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion UX Journey',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const AUDION_KNOWLEDGE_SPECIALIST: AssistantSpecialist = {
  id: 'audion_knowledge',
  label: 'Audion Knowledge',
  toolFamilies: [...AUDION_KNOWLEDGE_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion Knowledge',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const AUDION_JOURNEY_SPECIALIST: AssistantSpecialist = {
  id: 'audion_journey',
  label: 'Audion Journey',
  toolFamilies: [...AUDION_JOURNEY_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion Journey',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const AUDION_CHAT_SPECIALIST: AssistantSpecialist = {
  id: 'audion_chat',
  label: 'Audion Chat',
  toolFamilies: [...AUDION_CHAT_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion Chat',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const AUDION_DOCUMENTS_SPECIALIST: AssistantSpecialist = {
  id: 'audion_documents',
  label: 'Audion Documents',
  toolFamilies: [...AUDION_DOCUMENTS_FAMILIES],
  maxToolRounds: 4,
  buildSystemAddendum: async (ctx) =>
    withSpecialistHeader(
      'Audion Documents',
      await buildAudionIntegrationContextBlock({ useAudionMcp: ctx.useAudionMcp }),
    ),
};

const CHECKION_JOURNEY_SPECIALIST: AssistantSpecialist = {
  id: 'checkion_journey',
  label: 'Checkion Journey',
  toolFamilies: [...CHECKION_JOURNEY_FAMILIES],
  maxToolRounds: 4,
  buildSystemAddendum: (ctx) =>
    buildCheckionJourneySpecialistAddendum({ useCheckionMcp: ctx.useCheckionMcp }),
};

const SPIRION_SPECIALIST: AssistantSpecialist = {
  id: 'spirion_research',
  label: 'Spirion',
  toolFamilies: [...SPIRION_RESEARCH_FAMILIES],
  maxToolRounds: 5,
  buildSystemAddendum: (ctx) =>
    withSpecialistHeader(
      'Spirion',
      buildSpirionIntegrationContextBlock({ useSpirionMcp: ctx.useSpirionMcp }),
    ),
};

const REGISTRY: Record<AssistantSpecialistId, AssistantSpecialist> = {
  metron_analytics: METRON_SPECIALIST,
  checkion_scan: CHECKION_SCAN_SPECIALIST,
  creation_scene_edit: CREATION_SCENE_SPECIALIST,
  videon_media: VIDEON_SPECIALIST,
  brandion_brand: BRANDION_SPECIALIST,
  echon_market: ECHON_SPECIALIST,
  checkion_seo_geo: CHECKION_GEO_SPECIALIST,
  audion_persona: AUDION_PERSONA_SPECIALIST,
  audion_ux_journey: AUDION_UX_JOURNEY_SPECIALIST,
  spirion_research: SPIRION_SPECIALIST,
  creation_design: CREATION_DESIGN_SPECIALIST,
  echon_audience: ECHON_AUDIENCE_SPECIALIST,
  audion_knowledge: AUDION_KNOWLEDGE_SPECIALIST,
  audion_journey: AUDION_JOURNEY_SPECIALIST,
  audion_chat: AUDION_CHAT_SPECIALIST,
  audion_documents: AUDION_DOCUMENTS_SPECIALIST,
  checkion_journey: CHECKION_JOURNEY_SPECIALIST,
};

/** @deprecated Use REGISTERED_SPECIALIST_IDS — Wave 1 subset kept for older tests. */
export const WAVE1_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  'metron_analytics',
  'checkion_scan',
  'creation_scene_edit',
];

export const WAVE2_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  'videon_media',
  'brandion_brand',
  'echon_market',
];

export const WAVE3_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  'checkion_seo_geo',
  'audion_persona',
  'audion_ux_journey',
  'spirion_research',
  'creation_design',
  'echon_audience',
];

export const WAVE4_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  'audion_knowledge',
  'audion_journey',
  'audion_chat',
  'audion_documents',
  'checkion_journey',
];

/** All registered specialist ids (Wave 1–4). */
export const REGISTERED_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  ...WAVE1_SPECIALIST_IDS,
  ...WAVE2_SPECIALIST_IDS,
  ...WAVE3_SPECIALIST_IDS,
  ...WAVE4_SPECIALIST_IDS,
];

export function resolveSpecialist(
  intent: AssistantPlanIntent | string,
): AssistantSpecialist | null {
  const result = isAssistantSpecialistId(intent) ? REGISTRY[intent] ?? null : null
  const questions: JevQuestions = {
    specialist: choiceQuestion('Assistant specialist for this intent', [
      'none',
      ...REGISTERED_SPECIALIST_IDS,
    ]),
  }
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.assistantSpecialist,
    state: { intent: String(intent) },
    questions,
    baseline: result?.id ?? 'none',
    extractChoiceKey: 'specialist',
  })
  return result
}

/**
 * Planner remains SoT for the live plan; specialist.maxToolRounds is a floor
 * so domain profiles are not under-budgeted by a thin LLM plan.
 */
export function resolveSpecialistToolRoundBudget(
  planMaxToolRounds: number,
  specialist: AssistantSpecialist | null,
): number {
  const floor = specialist?.maxToolRounds;
  if (typeof floor !== 'number' || floor <= 0) return planMaxToolRounds;
  return Math.max(planMaxToolRounds, floor);
}

/** Canonical families for Creation when Spirion MCP is on (planner may widen). */
export function creationSceneSpecialistFamilies(hasSpirionMcp: boolean) {
  return hasSpirionMcp
    ? [...CREATION_SCENE_EDIT_WITH_SPIRION_FAMILIES]
    : [...CREATION_SCENE_EDIT_FAMILIES];
}

export type { AssistantSpecialist, AssistantSpecialistId, SpecialistContext } from '@/lib/assistant/specialists/types';
export { isAssistantSpecialistId } from '@/lib/assistant/specialists/types';
