import type { RequestUser } from '@/lib/auth-request-user';
import {
  buildPlanSystemPromptBlock,
  createToolFilter,
  planAssistantTurn,
  type AssistantPlan,
} from '@/lib/assistant/assistant-planner';
import {
  retrieveProjectKnowledge,
  type RetrievalResult,
} from '@/lib/assistant/knowledge-retrieval';
import { buildAudionIntegrationContextBlock } from '@/lib/integrations/audion-connectivity';
import { buildBrandionIntegrationContextBlock } from '@/lib/integrations/brandion-connectivity';
import { buildCreationIntegrationContextBlock } from '@/lib/integrations/creation-connectivity';
import { buildEchonIntegrationContextBlock } from '@/lib/integrations/echon-connectivity';
import { buildSpirionIntegrationContextBlock } from '@/lib/integrations/spirion-connectivity';
import { buildVideonIntegrationContextBlock } from '@/lib/integrations/videon-connectivity';
import { buildMetronIntegrationContextBlock } from '@/lib/integrations/metron-connectivity';
import { resolveSpecialist, resolveSpecialistToolRoundBudget } from '@/lib/assistant/specialists';
import {
  runOrchestratorComplete,
  type OrchestratorCompleteOptions,
  type OrchestratorCompleteResult,
} from '@/lib/assistant/orchestrator-complete';
import { buildUiToolsPromptBlock, buildUiPanelHintForPlan } from '@/lib/assistant/ui-tools/catalog-for-prompt';

import { buildPlanningPromptFromConversation } from '@/lib/assistant/audience-write-intent';
import { qualityJobForCreationCraftPlaybook } from '@/lib/assistant/creation-craft-playbooks';
import { resolveCreationSceneBudget } from '@/lib/assistant/creation-model-tier';
import { buildCreationCraftMemoryHydrateBlock } from '@/lib/assistant/knowledge-pack/distill-creation-craft';
import { buildAssistantSystemPrompt } from '@/lib/assistant/system-prompt';
import type { AssistantStreamPhase } from '@/lib/assistant/assistant-sse';
import type { UiBlock, UiLayout, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import type { AssistantPageContext } from '@/lib/assistant/page-context';
import { buildAssistantPageContextBlock } from '@/lib/assistant/page-context/hydrate-event-quick-check';
import { resolveMcpFlagsForPlan } from '@/lib/assistant/mcp-flags-for-plan';
import { prefetchCreationSceneTreeBlock } from '@/lib/assistant/creation-scene-prefetch';

export type AgentProgressCallback = (event: {
  type: 'phase';
  phase: AssistantStreamPhase;
  detail?: string;
}) => void;

export type RunAssistantAgentInput = {
  apiKey: string;
  user: RequestUser;
  prompt: string;
  images?: OrchestratorCompleteOptions['images'];
  history: OrchestratorCompleteOptions['history'];
  platformProjectId?: string | null;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  userName: string | null;
  userEmail: string;
  companies: Array<{ id: string; name: string }>;
  useCheckionMcp: boolean;
  useAudionMcp: boolean;
  useEchonMcp: boolean;
  useBrandionMcp: boolean;
  useCreationMcp: boolean;
  useSpirionMcp: boolean;
  useVideonMcp: boolean;
  useMetronMcp: boolean;
  beforeToolCall?: OrchestratorCompleteOptions['beforeToolCall'];
  onProgress?: AgentProgressCallback;
  onPlan?: (plan: AssistantPlan) => void;
  onRetrieval?: (retrieval: RetrievalResult) => void;
  onTextDelta?: (delta: string) => void;
  onThinkingDelta?: (delta: string) => void;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, preview: string) => void;
  onUiBlock?: (block: UiBlock, index: number) => void;
  onUiBlockUpdate?: (block: UiBlock, index: number) => void;
  onUiPanel?: (panel: UiPanelState) => void;
  onUiReset?: () => void;
  pageContext?: AssistantPageContext | null;
};

export type RunAssistantAgentResult = OrchestratorCompleteResult & {
  plan: AssistantPlan;
  retrieval?: RetrievalResult | null;
  uiLayout?: UiLayout;
  specialistId?: string | null;
  specialistLabel?: string | null;
};

const RETRIEVAL_INTENTS = new Set<AssistantPlan['intent']>([
  'project_knowledge',
  'audion_knowledge',
  'general_chat',
]);

export async function runAssistantAgent(
  input: RunAssistantAgentInput
): Promise<RunAssistantAgentResult> {
  input.onProgress?.({ type: 'phase', phase: 'planning' });

  const pageContextBlock = await buildAssistantPageContextBlock(input.user, input.pageContext);

  const baseSystemPrompt = await buildAssistantSystemPrompt(input.user, {
    userName: input.userName,
    userEmail: input.userEmail,
    companies: input.companies,
    platformProjectId: input.platformProjectId,
    checkionProjectId: input.checkionProjectId,
    audionProjectId: input.audionProjectId,
    plexonUserId: input.user.id,
    pageContextBlock,
  });

  const compactContextLoaded = baseSystemPrompt.includes('## Projektkontext (Kurzfassung)');

  const planningPrompt = buildPlanningPromptFromConversation(
    input.history ?? [],
    input.prompt
  );

  const plan = await planAssistantTurn(input.apiKey, {
    prompt: input.prompt,
    planningPrompt,
    hasProjectContext: Boolean(input.platformProjectId),
    hasCheckionMcp: input.useCheckionMcp,
    hasAudionMcp: input.useAudionMcp,
    hasEchonMcp: input.useEchonMcp,
    hasBrandionMcp: input.useBrandionMcp,
    hasCreationMcp: input.useCreationMcp,
    hasSpirionMcp: input.useSpirionMcp,
    hasVideonMcp: input.useVideonMcp,
    hasMetronMcp: input.useMetronMcp,
    compactContextLoaded,
    pageContext: input.pageContext,
  });
  const specialist = resolveSpecialist(plan.intent);
  const maxToolRounds = resolveSpecialistToolRoundBudget(plan.maxToolRounds, specialist);
  input.onPlan?.(plan);
  if (specialist) {
    input.onProgress?.({
      type: 'phase',
      phase: 'planning',
      detail: specialist.label,
    });
  }

  const mcpFlags = resolveMcpFlagsForPlan(plan, {
    useCheckionMcp: input.useCheckionMcp,
    useAudionMcp: input.useAudionMcp,
    useEchonMcp: input.useEchonMcp,
    useBrandionMcp: input.useBrandionMcp,
    useCreationMcp: input.useCreationMcp,
    useSpirionMcp: input.useSpirionMcp,
    useVideonMcp: input.useVideonMcp,
    useMetronMcp: input.useMetronMcp,
  });

  const specialistCtx = {
    useCheckionMcp: mcpFlags.useCheckionMcp,
    useAudionMcp: mcpFlags.useAudionMcp,
    useEchonMcp: mcpFlags.useEchonMcp,
    useBrandionMcp: mcpFlags.useBrandionMcp,
    useCreationMcp: mcpFlags.useCreationMcp,
    useSpirionMcp: mcpFlags.useSpirionMcp,
    useVideonMcp: mcpFlags.useVideonMcp,
    useMetronMcp: mcpFlags.useMetronMcp,
  };

  // Connectivity only after plan: specialist → one addendum; else full product stack.
  const productConnectivityBlock = specialist
    ? await Promise.resolve(specialist.buildSystemAddendum(specialistCtx))
    : [
        await buildAudionIntegrationContextBlock({
          useAudionMcp: mcpFlags.useAudionMcp,
        }),
        await buildEchonIntegrationContextBlock({
          useEchonMcp: mcpFlags.useEchonMcp,
        }),
        buildBrandionIntegrationContextBlock({
          useBrandionMcp: mcpFlags.useBrandionMcp,
        }),
        buildCreationIntegrationContextBlock({
          useCreationMcp: mcpFlags.useCreationMcp,
        }),
        buildSpirionIntegrationContextBlock({
          useSpirionMcp: mcpFlags.useSpirionMcp,
        }),
        buildVideonIntegrationContextBlock({
          useVideonMcp: mcpFlags.useVideonMcp,
        }),
        buildMetronIntegrationContextBlock({
          useMetronMcp: mcpFlags.useMetronMcp,
        }),
      ].join('\n\n');

  let retrieval: RetrievalResult | null = null;
  if (
    input.platformProjectId &&
    RETRIEVAL_INTENTS.has(plan.intent) &&
    (input.checkionProjectId || input.audionProjectId)
  ) {
    input.onProgress?.({ type: 'phase', phase: 'retrieval' });
    retrieval = await retrieveProjectKnowledge({
      prompt: input.prompt,
      plexonUserId: input.user.id,
      checkionProjectId: input.checkionProjectId,
      audionProjectId: input.audionProjectId,
    });
    input.onRetrieval?.(retrieval);
  }

  input.onProgress?.({
    type: 'phase',
    phase: maxToolRounds > 0 && !plan.skipTools ? 'tools' : 'executing',
  });

  const scenePrefetch =
    plan.intent === 'creation_scene_edit'
      ? await prefetchCreationSceneTreeBlock({
          pageContext: input.pageContext,
          actorUserId: input.user.id,
          useCreationMcp: mcpFlags.useCreationMcp,
          useSpirionMcp: mcpFlags.useSpirionMcp,
        })
      : null;
  if (scenePrefetch) {
    for (const hit of scenePrefetch.hits) {
      input.onToolStart?.(hit.toolName, {
        sceneId: input.pageContext?.entityId,
        prefetch: true,
      });
      input.onToolEnd?.(hit.toolName, hit.preview);
    }
  }

  const retrievalBlock = retrieval?.block ? `\n${retrieval.block}\n` : '';
  const prefetchBlock = scenePrefetch?.block ? `\n${scenePrefetch.block}\n` : '';
  const craftMemoryBlock =
    plan.intent === 'creation_scene_edit' && input.platformProjectId
      ? await buildCreationCraftMemoryHydrateBlock(input.platformProjectId)
      : null;
  const craftMemoryPrompt = craftMemoryBlock ? `\n${craftMemoryBlock}\n` : '';
  const uiPanelHint = buildUiPanelHintForPlan(plan.intent);
  const systemPrompt = `${baseSystemPrompt}\n\n${productConnectivityBlock}\n${retrievalBlock}${prefetchBlock}${craftMemoryPrompt}\n${buildPlanSystemPromptBlock(plan, specialist)}${uiPanelHint ? `\n\n${uiPanelHint}` : ''}\n\n${buildUiToolsPromptBlock()}`;

  const creationBudget = resolveCreationSceneBudget({
    intent: plan.intent,
    allowWriteTools: plan.allowWriteTools,
    playbookId: plan.creationCraftPlaybookId,
  });

  const orchestratorResult = await runOrchestratorComplete({
    apiKey: input.apiKey,
    prompt: input.prompt,
    images: input.images,
    history: input.history,
    systemPrompt,
    useCheckionMcp: mcpFlags.useCheckionMcp,
    useAudionMcp: mcpFlags.useAudionMcp,
    useEchonMcp: mcpFlags.useEchonMcp,
    useBrandionMcp: mcpFlags.useBrandionMcp,
    useCreationMcp: mcpFlags.useCreationMcp,
    useSpirionMcp: mcpFlags.useSpirionMcp,
    useVideonMcp: mcpFlags.useVideonMcp,
    useMetronMcp: mcpFlags.useMetronMcp,
    pageContext: input.pageContext,
    platformProjectId: input.platformProjectId,
    audionProjectId: input.audionProjectId,
    checkionProjectId: input.checkionProjectId,
    actorUserId: input.user.id,
    maxToolRounds,
    thinkingBudgetTokens: creationBudget.thinkingBudgetTokens,
    skipTools: plan.skipTools,
    modelProfile: 'assistant',
    modelOverride: creationBudget.tier === 'high' ? creationBudget.model : undefined,
    beforeToolCall: input.beforeToolCall,
    toolsFilter: createToolFilter([], plan),
    onTextDelta: input.onTextDelta,
    onThinkingDelta: input.onThinkingDelta,
    onToolRound: () => input.onProgress?.({ type: 'phase', phase: 'tools' }),
    onToolStart: input.onToolStart,
    onToolEnd: input.onToolEnd,
    onUiBlock: input.onUiBlock,
    onUiBlockUpdate: input.onUiBlockUpdate,
    onUiPanel: input.onUiPanel,
    onUiReset: input.onUiReset,
    creationQualityGate: plan.intent === 'creation_scene_edit' && plan.allowWriteTools,
    creationQualityUserPrompt: input.prompt,
    creationQualityJob: qualityJobForCreationCraftPlaybook(plan.creationCraftPlaybookId),
    creationCraftPlaybookId: plan.creationCraftPlaybookId ?? null,
  });

  return {
    ...orchestratorResult,
    plan,
    retrieval,
    uiLayout: orchestratorResult.uiLayout,
    specialistId: specialist?.id ?? null,
    specialistLabel: specialist?.label ?? null,
  };
}
