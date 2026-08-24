import type { AssistantPlan } from '@/lib/assistant/assistant-planner';

export type AssistantMcpFlags = {
  useCheckionMcp: boolean;
  useAudionMcp: boolean;
  useEchonMcp: boolean;
  useBrandionMcp: boolean;
  useCreationMcp: boolean;
};

/**
 * Narrow which product MCP servers to contact for a planned turn.
 * Avoids sequential initialize+tools/list on 5 servers when only one product is needed
 * (the main latency before creation_scene_tree_index).
 */
export function resolveMcpFlagsForPlan(
  plan: AssistantPlan,
  flags: AssistantMcpFlags,
): AssistantMcpFlags {
  switch (plan.intent) {
    case 'creation_scene_edit':
    case 'creation_design':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: flags.useCreationMcp,
      };
    case 'brandion_brand':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: flags.useBrandionMcp,
        useCreationMcp: false,
      };
    case 'echon_market':
    case 'echon_audience':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: flags.useEchonMcp,
        useBrandionMcp: false,
        useCreationMcp: false,
      };
    case 'audion_persona':
    case 'audion_knowledge':
    case 'audion_journey':
    case 'audion_ux_journey':
    case 'audion_chat':
    case 'audion_documents':
      return {
        useCheckionMcp: false,
        useAudionMcp: flags.useAudionMcp,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: false,
      };
    case 'checkion_scan':
    case 'checkion_seo_geo':
    case 'checkion_journey':
      return {
        useCheckionMcp: flags.useCheckionMcp,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: false,
      };
    default:
      return flags;
  }
}
