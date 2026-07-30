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
import { buildEchonIntegrationContextBlock } from '@/lib/integrations/echon-connectivity';
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

  const baseSystemPrompt = await buildAssistantSystemPrompt(input.user, {
    userName: input.userName,
    userEmail: input.userEmail,
    companies: input.companies,
    platformProjectId: input.platformProjectId,
    checkionProjectId: input.checkionProjectId,
    audionProjectId: input.audionProjectId,
    plexonUserId: input.user.id,
  });

  const audionIntegrationBlock = await buildAudionIntegrationContextBlock({
    useAudionMcp: input.useAudionMcp,
  });

  const echonIntegrationBlock = await buildEchonIntegrationContextBlock({
    useEchonMcp: input.useEchonMcp,
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
    compactContextLoaded,
  });
  input.onPlan?.(plan);

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

  const retrievalBlock = retrieval?.block ? `\n${retrieval.block}\n` : '';
  const uiPanelHint = buildUiPanelHintForPlan(plan.intent);
  const systemPrompt = `${baseSystemPrompt}\n\n${audionIntegrationBlock}\n\n${echonIntegrationBlock}\n${retrievalBlock}\n${buildPlanSystemPromptBlock(plan)}${uiPanelHint ? `\n\n${uiPanelHint}` : ''}\n\n${buildUiToolsPromptBlock()}`;

  const orchestratorResult = await runOrchestratorComplete({
    apiKey: input.apiKey,
    prompt: input.prompt,
    history: input.history,
    systemPrompt,
    useCheckionMcp: input.useCheckionMcp,
    useAudionMcp: input.useAudionMcp,
    useEchonMcp: input.useEchonMcp,
    maxToolRounds: plan.maxToolRounds,
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
