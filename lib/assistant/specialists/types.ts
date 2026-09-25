/**
 * Internal domain specialists — Wave 1.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import type { AssistantPlanIntent } from '@/lib/assistant/assistant-planner';
import type { ToolFamily } from '@/lib/assistant/tool-catalog';

export type AssistantSpecialistId =
  | 'metron_analytics'
  | 'checkion_scan'
  | 'creation_scene_edit';

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
  buildSystemAddendum: (ctx: SpecialistContext) => string;
  maxToolRounds?: number;
};

export function isAssistantSpecialistId(
  intent: AssistantPlanIntent | string,
): intent is AssistantSpecialistId {
  return (
    intent === 'metron_analytics' ||
    intent === 'checkion_scan' ||
    intent === 'creation_scene_edit'
  );
}
