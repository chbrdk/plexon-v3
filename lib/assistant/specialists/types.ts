/**
 * Internal domain specialists.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import type { AssistantPlanIntent } from '@/lib/assistant/assistant-planner';
import type { ToolFamily } from '@/lib/assistant/tool-catalog';

export type AssistantSpecialistId =
  | 'metron_analytics'
  | 'checkion_scan'
  | 'creation_scene_edit'
  | 'videon_media'
  | 'brandion_brand'
  | 'echon_market';

export type SpecialistContext = {
  useCheckionMcp: boolean;
  useAudionMcp: boolean;
  useEchonMcp: boolean;
  useBrandionMcp: boolean;
  useCreationMcp: boolean;
  useSpirionMcp: boolean;
  useVideonMcp: boolean;
  useMetronMcp: boolean;
};

export type AssistantSpecialist = {
  id: AssistantSpecialistId;
  label: string;
  /** Documented families; live plan from planner remains SoT. */
  toolFamilies: ToolFamily[];
  buildSystemAddendum: (ctx: SpecialistContext) => string | Promise<string>;
  maxToolRounds?: number;
};

const SPECIALIST_IDS: readonly AssistantSpecialistId[] = [
  'metron_analytics',
  'checkion_scan',
  'creation_scene_edit',
  'videon_media',
  'brandion_brand',
  'echon_market',
] as const;

export function isAssistantSpecialistId(
  intent: AssistantPlanIntent | string,
): intent is AssistantSpecialistId {
  return (SPECIALIST_IDS as readonly string[]).includes(intent);
}
