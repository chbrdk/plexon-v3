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
import {
  runOrchestratorComplete,
  type OrchestratorCompleteOptions,
  type OrchestratorCompleteResult,
} from '@/lib/assistant/orchestrator-complete';
import { buildUiToolsPromptBlock, buildUiPanelHintForPlan } from '@/lib/assistant/ui-tools/catalog-for-prompt';

import { buildPlanningPromptFromConversation } from '@/lib/assistant/audience-write-intent';
import { buildAssistantSystemPrompt } from '@/lib/assistant/system-prompt';
import type { AssistantStreamPhase } from '@/lib/assistant/assistant-sse';
import type { UiBlock, UiLayout, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import type { AssistantPageContext } from '@/lib/assistant/page-context';
import { buildAssistantPageContextBlock } from '@/lib/assistant/page-context/hydrate-event-quick-check';
import { resolveMcpFlagsForPlan } from '@/lib/assistant/mcp-flags-for-plan';
import { prefetchCreationSceneTreeBlock } from '@/lib/assistant/creation-scene-prefetch';
import { resolveAssistantThinkingBudgetForIntent } from '@/lib/assistant/creation-scene-depth';

export type AgentProgressCallback = (event: {
  type: 'phase';
  phase: AssistantStreamPhase;
  detail?: string;
}) => void;

export type RunAssistantAgentInput = {
  apiKey: string;
  user: RequestUser;
  prompt: string;
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

  const audionIntegrationBlock = await buildAudionIntegrationContextBlock({
    useAudionMcp: input.useAudionMcp,
  });

  const echonIntegrationBlock = await buildEchonIntegrationContextBlock({
    useEchonMcp: input.useEchonMcp,
  });

  const brandionIntegrationBlock = buildBrandionIntegrationContextBlock({
    useBrandionMcp: input.useBrandionMcp,
  });

  const creationIntegrationBlock = buildCreationIntegrationContextBlock({
    useCreationMcp: input.useCreationMcp,
  });

  const spirionIntegrationBlock = buildSpirionIntegrationContextBlock({
    useSpirionMcp: input.useSpirionMcp,
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
    compactContextLoaded,
    pageContext: input.pageContext,
  });
  input.onPlan?.(plan);

  const mcpFlags = resolveMcpFlagsForPlan(plan, {
    useCheckionMcp: input.useCheckionMcp,
    useAudionMcp: input.useAudionMcp,
    useEchonMcp: input.useEchonMcp,
    useBrandionMcp: input.useBrandionMcp,
    useCreationMcp: input.useCreationMcp,
    useSpirionMcp: input.useSpirionMcp,
  });

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
    phase: plan.maxToolRounds > 0 && !plan.skipTools ? 'tools' : 'executing',
  });

  const sceneTreePrefetch =
    plan.intent === 'creation_scene_edit'
      ? await prefetchCreationSceneTreeBlock({
          pageContext: input.pageContext,
          actorUserId: input.user.id,
          useCreationMcp: mcpFlags.useCreationMcp,
        })
      : null;
  if (sceneTreePrefetch) {
    input.onToolStart?.('creation_scene_tree_index', {
      sceneId: input.pageContext?.entityId,
      prefetch: true,
    });
    input.onToolEnd?.('creation_scene_tree_index', 'prefetch outline');
  }

  const retrievalBlock = retrieval?.block ? `\n${retrieval.block}\n` : '';
  const prefetchBlock = sceneTreePrefetch ? `\n${sceneTreePrefetch}\n` : '';
  const uiPanelHint = buildUiPanelHintForPlan(plan.intent);
  const systemPrompt = `${baseSystemPrompt}\n\n${audionIntegrationBlock}\n\n${echonIntegrationBlock}\n\n${brandionIntegrationBlock}\n\n${creationIntegrationBlock}\n\n${spirionIntegrationBlock}\n${retrievalBlock}${prefetchBlock}\n${buildPlanSystemPromptBlock(plan)}${uiPanelHint ? `\n\n${uiPanelHint}` : ''}\n\n${buildUiToolsPromptBlock()}`;

  const orchestratorResult = await runOrchestratorComplete({
    apiKey: input.apiKey,
    prompt: input.prompt,
    history: input.history,
    systemPrompt,
    useCheckionMcp: mcpFlags.useCheckionMcp,
    useAudionMcp: mcpFlags.useAudionMcp,
    useEchonMcp: mcpFlags.useEchonMcp,
    useBrandionMcp: mcpFlags.useBrandionMcp,
    useCreationMcp: mcpFlags.useCreationMcp,
    useSpirionMcp: mcpFlags.useSpirionMcp,
    pageContext: input.pageContext,
    platformProjectId: input.platformProjectId,
    actorUserId: input.user.id,
    maxToolRounds: plan.maxToolRounds,
    thinkingBudgetTokens: resolveAssistantThinkingBudgetForIntent(plan.intent),
    skipTools: plan.skipTools,
    modelProfile: 'assistant',
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
  });

  return { ...orchestratorResult, plan, retrieval, uiLayout: orchestratorResult.uiLayout };
}
