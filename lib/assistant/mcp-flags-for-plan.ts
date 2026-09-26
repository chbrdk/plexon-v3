import type { AssistantPlan } from '@/lib/assistant/assistant-planner';
import { JEV_USE_CASES, questionsMcpFlags } from '@/lib/jev/catalog';
import { scheduleJevShadow } from '@/lib/jev/schedule';

export type AssistantMcpFlags = {
  useCheckionMcp: boolean;
  useAudionMcp: boolean;
  useEchonMcp: boolean;
  useBrandionMcp: boolean;
  useCreationMcp: boolean;
  useSpirionMcp: boolean;
  useVideonMcp: boolean;
  useMetronMcp: boolean;
};

/**
 * Narrow which product MCP servers to contact for a planned turn.
 * Avoids sequential initialize+tools/list on all servers when only one product is needed.
 */
export function resolveMcpFlagsForPlan(
  plan: AssistantPlan,
  flags: AssistantMcpFlags,
): AssistantMcpFlags {
  const resolved = resolveMcpFlagsForPlanCore(plan, flags)
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.assistantMcpFlagsForPlan,
    state: { intent: plan.intent, flags },
    questions: questionsMcpFlags(),
    baseline: {
      use_creation: resolved.useCreationMcp,
      use_checkion: resolved.useCheckionMcp,
      use_audion: resolved.useAudionMcp,
      use_echon: resolved.useEchonMcp,
      use_brandion: resolved.useBrandionMcp,
      use_videon: resolved.useVideonMcp,
      use_metron: resolved.useMetronMcp,
    },
    extractNoulKey: 'use_creation',
  })
  return resolved
}

function resolveMcpFlagsForPlanCore(
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
        // Active Brandion pack for set_token_binding (Collection identity).
        useBrandionMcp: flags.useBrandionMcp,
        useCreationMcp: flags.useCreationMcp,
        // Scene builds may pull Spirion references/screens for inspiration.
        useSpirionMcp: flags.useSpirionMcp,
        useVideonMcp: false,
        useMetronMcp: false,
      };
    case 'spirion_research':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: false,
        useSpirionMcp: flags.useSpirionMcp,
        useVideonMcp: false,
        useMetronMcp: false,
      };
    case 'brandion_brand':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: flags.useBrandionMcp,
        useCreationMcp: false,
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: false,
      };
    case 'videon_media':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: false,
        useSpirionMcp: false,
        useVideonMcp: flags.useVideonMcp,
        useMetronMcp: false,
      };
    case 'metron_analytics':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: false,
        useBrandionMcp: false,
        useCreationMcp: false,
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: flags.useMetronMcp,
      };
    case 'echon_market':
      return {
        useCheckionMcp: false,
        useAudionMcp: false,
        useEchonMcp: flags.useEchonMcp,
        useBrandionMcp: false,
        useCreationMcp: false,
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: false,
      };
    case 'echon_audience':
      return {
        useCheckionMcp: flags.useCheckionMcp,
        useAudionMcp: flags.useAudionMcp,
        useEchonMcp: flags.useEchonMcp,
        useBrandionMcp: false,
        useCreationMcp: false,
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: false,
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
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: false,
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
        useSpirionMcp: false,
        useVideonMcp: false,
        useMetronMcp: false,
      };
    default:
      return flags;
  }
}
