import {
  getCheckionMcpUrl,
  getAudionMcpUrl,
  getEchonMcpUrl,
  getBrandionMcpUrl,
  getCreationMcpUrl,
  getSpirionMcpUrl,
  getVideonMcpUrl,
  getBoardCompletionModel,
  getBoardCompletionModelWithMcp,
  getAssistantCompletionModel,
  getAssistantCompletionModelWithMcp,
  getAssistantThinkingBudgetTokens,
} from '@/lib/constants';
import {
  fetchCheckionMcpTools,
  callCheckionMcpTool,
  type AnthropicTool,
} from '@/lib/checkion-mcp-client';
import {
  ASSISTANT_MAX_PROMPT_CHARS,
  ASSISTANT_MAX_TOOL_RESULT_CHARS,
  truncateAssistantText,
  trimMessageHistory,
} from '@/lib/assistant/context-budget';
import { maybeCompactSceneTreeToolResult } from '@/lib/assistant/creation-scene-tree-outline';
import { injectAssistantMcpToolArgs, extractCreationSceneUpdatedAt } from '@/lib/assistant/creation-scene-tool-args';
import { shouldRunAssistantToolsInParallel } from '@/lib/assistant/mcp-tool-parallel';
import { evaluateCreationSceneQuality, resolveCreationSceneQualityJob } from '@/lib/assistant/creation-scene-quality';
import { distillCreationCraftToKnowledgePack } from '@/lib/assistant/knowledge-pack/distill-creation-craft';
import {
  formatToolResultForAnthropic,
  isCreationScenePreviewToolName,
  type AnthropicToolResultContent,
} from '@/lib/assistant/tool-result-multimodal';
import {
  buildUserTurnContent,
  type AnthropicUserContentPart,
} from '@/lib/assistant/user-turn-images';
import type { AssistantResolvedImage } from '@/lib/assistant/image-upload-store';
import { parseAnthropicMessageStream } from '@/lib/assistant/anthropic-stream';
import {
  getPlexonUiAnthropicTools,
  PLEXON_UI_APPEND_BLOCK,
  PLEXON_UI_UPDATE_BLOCK,
  PLEXON_UI_RENDER_TEXT,
  isPlexonUiTool,
} from '@/lib/assistant/ui-tools/definitions';
import { executePlexonUiTool } from '@/lib/assistant/ui-tools/executor';
import { UiBlockAccumulator } from '@/lib/assistant/ui-tools/accumulator';
import type { UiBlock, UiLayout, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import {
  buildBrandionTokenBlocks,
  isBrandionTokensListToolName,
  parseBrandionTokensListPayload,
} from '@/lib/assistant/ui-blocks/build-brandion-token-ui';
import {
  buildVideonMediaSearchBlocks,
  isVideonMediaSearchToolName,
  parseVideonMediaSearchPayload,
} from '@/lib/assistant/ui-blocks/build-videon-media-search-ui';
import {
  buildVideonAnalysisGetBlocks,
  buildVideonMediaGetBlocks,
  isVideonAnalysisGetToolName,
  isVideonMediaGetToolName,
  parseVideonAnalysisGetPayload,
  parseVideonMediaGetPayload,
} from '@/lib/assistant/ui-blocks/build-videon-status-ui';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type OrchestratorMessage = { role: 'user' | 'assistant'; content: string };

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: AnthropicToolResultContent }
  | AnthropicUserContentPart;

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | ContentBlock[] | AnthropicUserContentPart[];
};

export type OrchestratorCompleteOptions = {
  apiKey: string;
  prompt: string;
  /** Current-turn Vision attachments (user uploads). */
  images?: AssistantResolvedImage[];
  history?: OrchestratorMessage[];
  systemPrompt?: string;
  useCheckionMcp?: boolean;
  useAudionMcp?: boolean;
  useEchonMcp?: boolean;
  useBrandionMcp?: boolean;
  useCreationMcp?: boolean;
  useSpirionMcp?: boolean;
  useVideonMcp?: boolean;
  pageContext?: import('@/lib/assistant/page-context').AssistantPageContext | null;
  /** Collection id for Spirion live search injection when pageContext lacks it. */
  platformProjectId?: string | null;
  actorUserId?: string;
  maxToolRounds?: number;
  /** Override extended-thinking budget (e.g. Creation scene depth). Omit → env default. */
  thinkingBudgetTokens?: number;
  modelProfile?: 'board' | 'assistant';
  /** Optional Anthropic model override (Wave D high tier). */
  modelOverride?: string;
  skipTools?: boolean;
  toolsFilter?: (toolName: string) => boolean;
  beforeToolCall?: (toolName: string, input: Record<string, unknown>) => Promise<{
    allow: boolean;
    reason?: string;
    requiresConfirmation?: boolean;
  }>;
  onTextDelta?: (delta: string) => void;
  onThinkingDelta?: (delta: string) => void;
  onToolRound?: () => void;
  onToolStart?: (toolName: string, input: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, preview: string) => void;
  onUiBlock?: (block: UiBlock, index: number) => void;
  onUiBlockUpdate?: (block: UiBlock, index: number) => void;
  onUiPanel?: (panel: UiPanelState) => void;
  onUiReset?: () => void;
  /** Creation scene-edit: do not finish until audit + craft-debug + preview (after writes). */
  creationQualityGate?: boolean;
  /** Prompt used to resolve landing vs generic quality job (Wave A1). */
  creationQualityUserPrompt?: string;
  /** Explicit quality job; default auto from prompt / playbook. */
  creationQualityJob?: 'landing' | 'newsletter' | 'print' | 'generic' | 'auto';
  /** Wave B playbook id — used for craft memory distill. */
  creationCraftPlaybookId?: import('@/lib/assistant/creation-craft-playbooks').CreationCraftPlaybookId | null;
};

export type OrchestratorCompleteResult = {
  text: string;
  toolsOffered?: number;
  uiLayout?: UiLayout;
  pendingConfirmation?: {
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
  };
};

const DESTRUCTIVE_TOOL_PATTERNS = [/delete/i, /\.project_delete$/, /\.scan_delete$/];

const WRITE_CONFIRM_TOOL_PATTERNS = [
  /scan_single$/,
  /scan_domain$/,
  /scan_journey_start$/,
  /scan_domain_journey_start$/,
  /geo_eeat_rerun_competitive$/,
  /persona_generate$/,
  /geo_eeat_start$/,
  /target_group_create$/,
  /research_run_start$/,
  /signal_ingest$/,
  /waves_detect$/,
  /project_create$/,
];

export function isDestructiveToolName(toolName: string): boolean {
  return DESTRUCTIVE_TOOL_PATTERNS.some((p) => p.test(toolName));
}

export function isConfirmationRequiredToolName(toolName: string): boolean {
  return (
    isDestructiveToolName(toolName) ||
    WRITE_CONFIRM_TOOL_PATTERNS.some((p) => p.test(toolName))
  );
}

export function normalizeMessageHistory(rawMessages: unknown[], maxHistory = 50): OrchestratorMessage[] {
  const history: OrchestratorMessage[] = [];
  for (let i = 0; i < Math.min(rawMessages.length, maxHistory); i++) {
    const m = rawMessages[i];
    if (m && typeof m === 'object' && typeof (m as OrchestratorMessage).content === 'string') {
      const role = (m as OrchestratorMessage).role;
      const content = String((m as OrchestratorMessage).content).trim();
      if (role === 'user' || role === 'assistant') {
        history.push({
          role,
          content: content.length > 0 ? content : role === 'user' ? '(no prompt)' : '(no response)',
        });
      }
    }
  }
  const normalized: OrchestratorMessage[] = [];
  for (const m of history) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      normalized.push({ ...m });
    }
  }
  return trimMessageHistory(normalized);
}

export type OrchestratorTimelineItem = {
  assistantContent: ContentBlock[];
  toolResults?: { id: string; content: AnthropicToolResultContent }[];
  userText?: string;
};

/** Exported for unit tests — current turn multimodal; history text-only. */
export function buildMessages(
  history: OrchestratorMessage[],
  currentPrompt: string,
  timeline: OrchestratorTimelineItem[],
  images: AssistantResolvedImage[] = [],
): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  if (history.length > 0) {
    for (const m of history) {
      out.push({ role: m.role, content: m.content });
    }
  }
  out.push({ role: 'user', content: buildUserTurnContent(currentPrompt, images) });
  for (const item of timeline) {
    out.push({ role: 'assistant', content: item.assistantContent });
    if (item.toolResults?.length) {
      out.push({
        role: 'user',
        content: item.toolResults.map((r) => ({
          type: 'tool_result' as const,
          tool_use_id: r.id,
          content: r.content,
        })),
      });
    } else if (item.userText) {
      out.push({ role: 'user', content: item.userText });
    }
  }
  return out;
}

function stripImagesFromToolContent(content: AnthropicToolResultContent): AnthropicToolResultContent {
  if (typeof content === 'string') return content;
  return content
    .filter((p) => p.type === 'text')
    .map((p) => (p.type === 'text' ? p : { type: 'text' as const, text: '[image omitted]' }));
}

function shrinkToolRoundsForBudget(timeline: OrchestratorTimelineItem[]): void {
  for (let i = 0; i < timeline.length - 1; i++) {
    const round = timeline[i];
    if (!round?.toolResults) continue;
    round.toolResults = round.toolResults.map((r) => ({
      ...r,
      content: stripImagesFromToolContent(r.content),
    }));
  }
  while (timeline.length > 1) {
    const messages = JSON.stringify(timeline);
    if (messages.length <= ASSISTANT_MAX_PROMPT_CHARS) break;
    timeline.shift();
  }
  if (timeline.length === 0) return;
  const messages = JSON.stringify(timeline);
  if (messages.length <= ASSISTANT_MAX_PROMPT_CHARS) return;
  const last = timeline[timeline.length - 1];
  if (!last?.toolResults) return;
  last.toolResults = last.toolResults.map((r) => ({
    id: r.id,
    content:
      typeof r.content === 'string'
        ? truncateAssistantText(
            r.content,
            Math.floor(ASSISTANT_MAX_TOOL_RESULT_CHARS / 2),
            'Tool',
          )
        : stripImagesFromToolContent(r.content),
  }));
}

export async function runOrchestratorComplete(
  options: OrchestratorCompleteOptions
): Promise<OrchestratorCompleteResult> {
  const {
    apiKey,
    prompt,
    images = [],
    history = [],
    systemPrompt,
    useCheckionMcp = false,
    useAudionMcp = false,
    useEchonMcp = false,
    useBrandionMcp = false,
    useCreationMcp = false,
    useSpirionMcp = false,
    useVideonMcp = false,
    pageContext = null,
    platformProjectId = null,
    actorUserId = '',
    maxToolRounds = 5,
    thinkingBudgetTokens,
    modelProfile = 'board',
    modelOverride,
    skipTools = false,
    toolsFilter,
    beforeToolCall,
    onTextDelta,
    onThinkingDelta,
    onToolRound,
    onToolStart,
    onToolEnd,
    onUiBlock,
    onUiBlockUpdate,
    onUiPanel,
    onUiReset,
    creationQualityGate = false,
    creationQualityUserPrompt,
    creationQualityJob = 'auto',
    creationCraftPlaybookId = null,
  } = options;

  const creationQualityOptions = {
    job: creationQualityJob,
    userPrompt: creationQualityUserPrompt ?? prompt,
  };

  const uiAccumulator = new UiBlockAccumulator();

  const checkionMcpUrl = useCheckionMcp ? getCheckionMcpUrl() : undefined;
  const audionMcpUrl = useAudionMcp ? getAudionMcpUrl() : undefined;
  const echonMcpUrl = useEchonMcp ? getEchonMcpUrl() : undefined;
  const brandionMcpUrl = useBrandionMcp ? getBrandionMcpUrl() : undefined;
  const creationMcpUrl = useCreationMcp ? getCreationMcpUrl() : undefined;
  const spirionMcpUrl = useSpirionMcp ? getSpirionMcpUrl() : undefined;
  const videonMcpUrl = useVideonMcp ? getVideonMcpUrl() : undefined;
  let tools: AnthropicTool[] = [];
  let mcpNameByAnthropicName: Record<string, string> = {};
  const toolSourceByAnthropicName: Record<string, string> = {};

  const mcpFetches: Array<
    Promise<{
      label: string;
      baseUrl: string;
      tools: AnthropicTool[];
      mcpNameByAnthropicName: Record<string, string>;
    } | null>
  > = [];
  const loadMcpTools = (label: string, baseUrl: string) =>
    fetchCheckionMcpTools(baseUrl)
      .then((fetched) => ({
        label,
        baseUrl,
        tools: fetched.tools,
        mcpNameByAnthropicName: fetched.mcpNameByAnthropicName,
      }))
      .catch((e) => {
        console.warn(`[orchestrator] ${label} MCP tools fetch failed`, e);
        return null;
      });
  if (checkionMcpUrl) mcpFetches.push(loadMcpTools('CHECKION', checkionMcpUrl));
  if (audionMcpUrl) mcpFetches.push(loadMcpTools('AUDION', audionMcpUrl));
  if (echonMcpUrl) mcpFetches.push(loadMcpTools('ECHON', echonMcpUrl));
  if (brandionMcpUrl) mcpFetches.push(loadMcpTools('BRANDION', brandionMcpUrl));
  if (creationMcpUrl) mcpFetches.push(loadMcpTools('CREATION', creationMcpUrl));
  if (spirionMcpUrl) mcpFetches.push(loadMcpTools('SPIRION', spirionMcpUrl));
  if (videonMcpUrl) mcpFetches.push(loadMcpTools('VIDEON', videonMcpUrl));
  if (mcpFetches.length) {
    const loaded = await Promise.all(mcpFetches);
    for (const fetched of loaded) {
      if (!fetched) continue;
      tools = [...tools, ...fetched.tools];
      Object.assign(mcpNameByAnthropicName, fetched.mcpNameByAnthropicName);
      for (const name of Object.keys(fetched.mcpNameByAnthropicName)) {
        toolSourceByAnthropicName[name] = fetched.baseUrl;
      }
    }
  }

  if (toolsFilter) {
    tools = tools.filter((t) => toolsFilter(t.name));
  }
  if (skipTools) {
    tools = [];
  }

  tools = [...tools, ...getPlexonUiAnthropicTools()];

  const toolsOffered = tools.length;
  const useMcp =
    !skipTools &&
    ((useCheckionMcp && checkionMcpUrl) ||
      (useAudionMcp && audionMcpUrl) ||
      (useEchonMcp && echonMcpUrl) ||
      (useBrandionMcp && brandionMcpUrl) ||
      (useCreationMcp && creationMcpUrl) ||
      (useSpirionMcp && spirionMcpUrl) ||
      (useVideonMcp && videonMcpUrl)) &&
    tools.length > 0;
  const model =
    (modelOverride && modelOverride.trim()) ||
    (useMcp
      ? modelProfile === 'assistant'
        ? getAssistantCompletionModelWithMcp()
        : getBoardCompletionModelWithMcp()
      : modelProfile === 'assistant'
        ? getAssistantCompletionModel()
        : getBoardCompletionModel());

  const timeline: OrchestratorTimelineItem[] = [];
  const qualityTraces: Array<{ name: string; preview: string }> = [];
  let lastText = '';

  const publishCraftMemoryIfReady = () => {
    if (!creationQualityGate || !platformProjectId) return;
    const verdict = evaluateCreationSceneQuality(qualityTraces, creationQualityOptions);
    if (!verdict.pass) return;
    const job = resolveCreationSceneQualityJob(creationQualityOptions);
    void distillCreationCraftToKnowledgePack({
      platformProjectId,
      actorUserId,
      qualityJob: job,
      playbookId: creationCraftPlaybookId,
      userPrompt: creationQualityUserPrompt ?? prompt,
      sceneId: typeof pageContext?.entityId === 'string' ? pageContext.entityId : null,
      traces: qualityTraces,
    }).catch((e) => {
      console.warn('[orchestrator] creation craft memory distill failed', e);
    });
  };
  const thinkingBudget =
    modelProfile === 'assistant' && (onTextDelta || onThinkingDelta)
      ? typeof thinkingBudgetTokens === 'number'
        ? Math.max(0, Math.floor(thinkingBudgetTokens))
        : getAssistantThinkingBudgetTokens()
      : 0;
  const useStream = Boolean(onTextDelta || onThinkingDelta);

  /** Optimistic lock shared across tool rounds in this completion (CREATION scene writes). */
  let turnSceneUpdatedAt = pageContext?.entityUpdatedAt?.trim() || null;

  for (let round = 0; round <= maxToolRounds; round++) {
    shrinkToolRoundsForBudget(timeline);
    const messages = buildMessages(history, prompt, timeline, images);
    const maxTokens = thinkingBudget > 0 ? thinkingBudget + 8192 : 4096;
    const bodyPayload: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
    };
    if (systemPrompt) {
      bodyPayload.system = systemPrompt;
    }
    if (tools.length > 0) {
      bodyPayload.tools = tools;
    }
    if (useStream) {
      bodyPayload.stream = true;
    }
    if (thinkingBudget > 0) {
      bodyPayload.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    }

    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        ...(useStream ? { Accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 500)}`);
    }

    let content: Array<{
      type: string;
      text?: string;
      thinking?: string;
      signature?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }> = [];
    let stopReason = 'end_turn';

    if (useStream) {
      const streamed = await parseAnthropicMessageStream(res.body, {
        onTextDelta,
        onThinkingDelta,
      });
      content = streamed.content;
      stopReason = streamed.stop_reason;
    } else {
      const data = (await res.json()) as {
        content?: Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: Record<string, unknown>;
        }>;
        stop_reason?: string;
      };
      content = data.content ?? [];
      stopReason = data.stop_reason ?? 'end_turn';
    }

    const textBlock = content.find((c) => c.type === 'text');
    lastText = textBlock && 'text' in textBlock ? String(textBlock.text) : '';

    const assistantContent: ContentBlock[] = content
      .map((c) => {
        if (c.type === 'thinking' && c.thinking != null) {
          return {
            type: 'thinking' as const,
            thinking: c.thinking,
            ...(c.signature ? { signature: c.signature } : {}),
          };
        }
        if (c.type === 'text' && c.text != null) return { type: 'text' as const, text: c.text };
        if (c.type === 'tool_use' && c.id && c.name)
          return { type: 'tool_use' as const, id: c.id, name: c.name, input: c.input ?? {} };
        return { type: 'text' as const, text: '' };
      })
      .filter((b) => (b.type === 'text' ? b.text !== '' : true));

    if (stopReason !== 'tool_use' || tools.length === 0) {
      if (creationQualityGate && tools.length > 0 && round < maxToolRounds) {
        const verdict = evaluateCreationSceneQuality(qualityTraces, creationQualityOptions);
        if (!verdict.pass) {
          timeline.push({ assistantContent, userText: verdict.nudge });
          continue;
        }
      }
      publishCraftMemoryIfReady();
      return { text: lastText, toolsOffered, uiLayout: uiAccumulator.getLayout() };
    }

    const toolUseBlocks = content.filter(
      (c): c is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        c.type === 'tool_use' && typeof c.id === 'string' && typeof c.name === 'string'
    );
    if (toolUseBlocks.length === 0) {
      if (creationQualityGate && round < maxToolRounds) {
        const verdict = evaluateCreationSceneQuality(qualityTraces, creationQualityOptions);
        if (!verdict.pass) {
          timeline.push({ assistantContent, userText: verdict.nudge });
          continue;
        }
      }
      publishCraftMemoryIfReady();
      return { text: lastText, toolsOffered, uiLayout: uiAccumulator.getLayout() };
    }

    onToolRound?.();

    type ToolUseBlock = (typeof toolUseBlocks)[number];
    const resultById = new Map<string, AnthropicToolResultContent>();
    const toRun: ToolUseBlock[] = [];

    for (const block of toolUseBlocks) {
      if (beforeToolCall) {
        const gate = await beforeToolCall(block.name, block.input ?? {});
        if (!gate.allow) {
          if (gate.requiresConfirmation) {
            return {
              text: lastText,
              toolsOffered,
              uiLayout: uiAccumulator.getLayout(),
              pendingConfirmation: {
                toolUseId: block.id,
                toolName: block.name,
                input: block.input ?? {},
              },
            };
          }
          resultById.set(
            block.id,
            JSON.stringify({ error: gate.reason ?? 'Tool call blocked' }),
          );
          continue;
        }
      } else if (isConfirmationRequiredToolName(block.name)) {
        return {
          text: lastText,
          toolsOffered,
          uiLayout: uiAccumulator.getLayout(),
          pendingConfirmation: {
            toolUseId: block.id,
            toolName: block.name,
            input: block.input ?? {},
          },
        };
      }
      toRun.push(block);
    }

    const runBlock = async (block: ToolUseBlock): Promise<{
      id: string;
      name: string;
      content: AnthropicToolResultContent;
      preview: string;
    }> => {
      const mcpName = mcpNameByAnthropicName[block.name] ?? block.name;
      const baseUrl = toolSourceByAnthropicName[block.name];

      if (isPlexonUiTool(block.name)) {
        onToolStart?.(block.name, block.input ?? {});
        const uiResult = executePlexonUiTool(block.name, block.input ?? {}, uiAccumulator);
          if (uiResult.block && uiResult.index != null) {
          if (block.name === PLEXON_UI_UPDATE_BLOCK) {
            onUiBlockUpdate?.(uiResult.block, uiResult.index);
          } else if (
            block.name === PLEXON_UI_APPEND_BLOCK ||
            block.name === PLEXON_UI_RENDER_TEXT
          ) {
            onUiBlock?.(uiResult.block, uiResult.index);
          }
        }
        if (uiResult.panel) {
          onUiPanel?.(uiResult.panel);
        }
        if (uiResult.cleared) {
          onUiReset?.();
        }
        const preview = uiResult.ok
          ? uiResult.cleared
            ? 'cleared'
            : `block:${uiResult.blockId}`
          : uiResult.error ?? 'error';
        onToolEnd?.(block.name, preview);
        return {
          id: block.id,
          name: block.name,
          content: JSON.stringify({
            ok: uiResult.ok,
            blockId: uiResult.blockId,
            index: uiResult.index,
            cleared: uiResult.cleared,
            error: uiResult.error,
          }),
          preview,
        };
      }

      if (!baseUrl) {
        const preview = `Unknown tool source for ${block.name}`;
        return {
          id: block.id,
          name: block.name,
          content: JSON.stringify({ error: preview }),
          preview,
        };
      }
      onToolStart?.(block.name, block.input ?? {});
      const toolInput = injectAssistantMcpToolArgs(block.name, block.input ?? {}, {
        pageContext,
        actorUserId,
        platformProjectId,
        sceneLockUpdatedAt: turnSceneUpdatedAt,
      });
      const result = await callCheckionMcpTool(baseUrl, mcpName, toolInput);
      const nextLock = extractCreationSceneUpdatedAt(result);
      if (nextLock) turnSceneUpdatedAt = nextLock;
      const compacted = maybeCompactSceneTreeToolResult(block.name, result);
      const multimodal =
        isCreationScenePreviewToolName(block.name) || isCreationScenePreviewToolName(mcpName)
          ? formatToolResultForAnthropic(block.name, compacted)
          : truncateAssistantText(
              compacted,
              ASSISTANT_MAX_TOOL_RESULT_CHARS,
              `Tool ${block.name}`,
            );
      const previewLog =
        typeof multimodal === 'string'
          ? multimodal.slice(0, 240)
          : multimodal
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join(' ')
              .slice(0, 240) || 'image';
      onToolEnd?.(block.name, previewLog);

      if (isBrandionTokensListToolName(mcpName) || isBrandionTokensListToolName(block.name)) {
        const payload = parseBrandionTokensListPayload(
          typeof multimodal === 'string' ? multimodal : compacted,
        );
        if (payload) {
          const autoBlocks = buildBrandionTokenBlocks(payload, {
            source: 'plexon_ui',
            toolCallId: block.id,
          });
          for (const auto of autoBlocks) {
            const appended = uiAccumulator.appendBlock(auto.type, auto.props, auto.meta);
            if (appended.ok) {
              onUiBlock?.(appended.block, uiAccumulator.blockCount - 1);
            }
          }
        }
      }

      if (isVideonMediaSearchToolName(mcpName) || isVideonMediaSearchToolName(block.name)) {
        const payload = parseVideonMediaSearchPayload(
          typeof multimodal === 'string' ? multimodal : compacted,
        );
        if (payload) {
          const autoBlocks = buildVideonMediaSearchBlocks(payload, {
            source: 'plexon_ui',
            toolCallId: block.id,
          });
          for (const auto of autoBlocks) {
            const appended = uiAccumulator.appendBlock(auto.type, auto.props, auto.meta);
            if (appended.ok) {
              onUiBlock?.(appended.block, uiAccumulator.blockCount - 1);
            }
          }
        }
      }

      if (isVideonMediaGetToolName(mcpName) || isVideonMediaGetToolName(block.name)) {
        const payload = parseVideonMediaGetPayload(
          typeof multimodal === 'string' ? multimodal : compacted,
        );
        if (payload) {
          const autoBlocks = buildVideonMediaGetBlocks(payload, {
            source: 'plexon_ui',
            toolCallId: block.id,
          });
          for (const auto of autoBlocks) {
            const appended = uiAccumulator.appendBlock(auto.type, auto.props, auto.meta);
            if (appended.ok) {
              onUiBlock?.(appended.block, uiAccumulator.blockCount - 1);
            }
          }
        }
      }

      if (isVideonAnalysisGetToolName(mcpName) || isVideonAnalysisGetToolName(block.name)) {
        const payload = parseVideonAnalysisGetPayload(
          typeof multimodal === 'string' ? multimodal : compacted,
        );
        if (payload) {
          const autoBlocks = buildVideonAnalysisGetBlocks(payload, {
            source: 'plexon_ui',
            toolCallId: block.id,
          });
          for (const auto of autoBlocks) {
            const appended = uiAccumulator.appendBlock(auto.type, auto.props, auto.meta);
            if (appended.ok) {
              onUiBlock?.(appended.block, uiAccumulator.blockCount - 1);
            }
          }
        }
      }

      return {
        id: block.id,
        name: block.name,
        content: multimodal,
        preview: previewLog,
      };
    };

    const executed = shouldRunAssistantToolsInParallel(toRun.map((b) => b.name))
      ? await Promise.all(toRun.map((block) => runBlock(block)))
      : await (async () => {
          const out: Array<{
            id: string;
            name: string;
            content: AnthropicToolResultContent;
            preview: string;
          }> = [];
          for (const block of toRun) {
            out.push(await runBlock(block));
          }
          return out;
        })();

    for (const item of executed) {
      resultById.set(item.id, item.content);
      qualityTraces.push({ name: item.name, preview: item.preview });
    }

    const toolResults = toolUseBlocks.map((block) => ({
      id: block.id,
      content:
        resultById.get(block.id) ??
        JSON.stringify({ error: 'missing-tool-result' }),
    }));

    timeline.push({ assistantContent, toolResults });
  }

  publishCraftMemoryIfReady();
  return { text: lastText, toolsOffered, uiLayout: uiAccumulator.getLayout() };
}
