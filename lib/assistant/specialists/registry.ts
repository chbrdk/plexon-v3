/**
 * Internal specialist registry (Wave 1 + Wave 2).
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import type { AssistantPlanIntent } from '@/lib/assistant/assistant-planner';
import {
  BRANDION_BRAND_FAMILIES,
  CREATION_SCENE_EDIT_FAMILIES,
  CREATION_SCENE_EDIT_WITH_SPIRION_FAMILIES,
  ECHON_MARKET_FAMILIES,
  METRON_ANALYTICS_FAMILIES,
  SCAN_FAMILIES,
  VIDEON_MEDIA_FAMILIES,
} from '@/lib/assistant/tool-catalog';
import { buildBrandionIntegrationContextBlock } from '@/lib/integrations/brandion-connectivity';
import { buildCreationIntegrationContextBlock } from '@/lib/integrations/creation-connectivity';
import { buildEchonIntegrationContextBlock } from '@/lib/integrations/echon-connectivity';
import { buildMetronIntegrationContextBlock } from '@/lib/integrations/metron-connectivity';
import { buildVideonIntegrationContextBlock } from '@/lib/integrations/videon-connectivity';
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

const REGISTRY: Record<AssistantSpecialistId, AssistantSpecialist> = {
  metron_analytics: METRON_SPECIALIST,
  checkion_scan: CHECKION_SCAN_SPECIALIST,
  creation_scene_edit: CREATION_SCENE_SPECIALIST,
  videon_media: VIDEON_SPECIALIST,
  brandion_brand: BRANDION_SPECIALIST,
  echon_market: ECHON_SPECIALIST,
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

/** All registered specialist ids (Wave 1 + 2). */
export const REGISTERED_SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  ...WAVE1_SPECIALIST_IDS,
  ...WAVE2_SPECIALIST_IDS,
];

export function resolveSpecialist(
  intent: AssistantPlanIntent | string,
): AssistantSpecialist | null {
  if (!isAssistantSpecialistId(intent)) return null;
  return REGISTRY[intent] ?? null;
}

/** Canonical families for Creation when Spirion MCP is on (planner may widen). */
export function creationSceneSpecialistFamilies(hasSpirionMcp: boolean) {
  return hasSpirionMcp
    ? [...CREATION_SCENE_EDIT_WITH_SPIRION_FAMILIES]
    : [...CREATION_SCENE_EDIT_FAMILIES];
}

export type { AssistantSpecialist, AssistantSpecialistId, SpecialistContext } from '@/lib/assistant/specialists/types';
export { isAssistantSpecialistId } from '@/lib/assistant/specialists/types';
