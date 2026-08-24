import { runAssistantAgent } from '@/lib/assistant/assistant-agent';
import {
  normalizeMessageHistory,
  isConfirmationRequiredToolName,
} from '@/lib/assistant/orchestrator-complete';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { listUserCompanies } from '@/lib/assistant/user-eligibility';
import { getUserProductEntitlementsMap } from '@/lib/db/product-entitlements';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import {
  resolveUseAudionMcp,
  resolveUseBrandionMcp,
  resolveUseCheckionMcp,
  resolveUseCreationMcp,
  resolveUseEchonMcp,
  resolveUseSpirionMcp,
} from '@/lib/assistant/product-mcp-gate';
import {
  emitPhase,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleFreeChatIntent: IntentHandler<'free_chat'> = async (ctx) => {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY not configured') as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  const entitlements = await getUserProductEntitlementsMap(ctx.user.id);
  const pageContext = ctx.body.pageContext ?? null;
  const hasAnyActiveEntitlement =
    entitlements.checkion?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE ||
    entitlements.audion?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE ||
    entitlements.brandion?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE ||
    entitlements.creation?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE ||
    entitlements.echon?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE ||
    entitlements.spirion?.status === PLATFORM_ENTITLEMENT_STATUS.ACTIVE;
  const useCheckionMcp = resolveUseCheckionMcp({
    checkionEntitlement: entitlements.checkion,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const useAudionMcp = resolveUseAudionMcp({
    audionEntitlement: entitlements.audion,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const useEchonMcp = resolveUseEchonMcp({
    echonEntitlement: entitlements.echon,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const useBrandionMcp = resolveUseBrandionMcp({
    brandionEntitlement: entitlements.brandion,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const useCreationMcp = resolveUseCreationMcp({
    creationEntitlement: entitlements.creation,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const useSpirionMcp = resolveUseSpirionMcp({
    spirionEntitlement: entitlements.spirion,
    pageContext,
    hasAnyActiveEntitlement,
  });
  const companies = await listUserCompanies(ctx.user.id);

  const effectivePrompt = ctx.body.confirmToolCall
    ? `Bestätigte Tool-Aktion: ${ctx.body.confirmToolCall.toolName} mit ${JSON.stringify(ctx.body.confirmToolCall.input)}`
    : ctx.prompt;

  emitPhase(ctx.emit, 'planning');

  try {
    const result = await runAssistantAgent({
      apiKey,
      user: ctx.user,
      prompt: effectivePrompt,
      history: normalizeMessageHistory(ctx.history.slice(0, -1)),
      platformProjectId: ctx.platformProjectId,
      checkionProjectId: ctx.bindingIds?.checkionProjectId,
      audionProjectId: ctx.bindingIds?.audionProjectId,
      userName: ctx.profile.name,
      userEmail: ctx.profile.email,
      companies,
      useCheckionMcp,
      useAudionMcp,
      useEchonMcp,
      useBrandionMcp,
      useCreationMcp,
      useSpirionMcp,
      pageContext: ctx.body.pageContext ?? null,
      onProgress: (ev) => {
        ctx.emit?.(ev);
        if (ev.type === 'phase' && ev.phase === 'tools') {
          ctx.emit?.({ type: 'token_reset' });
          ctx.emit?.({ type: 'thinking_reset' });
        }
      },
      onPlan: (plan) =>
        ctx.emit?.({
          type: 'plan',
          plan: {
            intent: plan.intent,
            mode: plan.mode,
            toolFamilies: plan.toolFamilies,
            maxToolRounds: plan.maxToolRounds,
            skipTools: plan.skipTools,
            source: plan.plannerSource,
            reasoning: plan.reasoning,
          },
        }),
      onRetrieval: (r) =>
        ctx.emit?.({
          type: 'retrieval',
          hits: r.hits.length,
          terms: r.terms,
          vectorHits: r.vectorHits,
        }),
      onTextDelta: (text) => ctx.emit?.({ type: 'token', text }),
      onThinkingDelta: (text) => ctx.emit?.({ type: 'thinking', text }),
      onToolStart: (name) => ctx.emit?.({ type: 'tool_call', status: 'start', name }),
      onToolEnd: (name, preview) => ctx.emit?.({ type: 'tool_call', status: 'done', name, preview }),
      onUiBlock: (block, index) => ctx.emit?.({ type: 'ui_block', block, index }),
      onUiBlockUpdate: (block, index) => ctx.emit?.({ type: 'ui_block_update', block, index }),
      onUiPanel: (panel) => ctx.emit?.({ type: 'ui_panel', panel }),
      onUiReset: () => ctx.emit?.({ type: 'ui_reset' }),
      beforeToolCall: async (toolName) => {
        if (ctx.body.confirmToolCall) return { allow: true };
        if (isConfirmationRequiredToolName(toolName)) {
          return { allow: false, requiresConfirmation: true, reason: 'confirmation_required' };
        }
        return { allow: true };
      },
    });

    let assistantText = result.text;
    const uiLayout = result.uiLayout;
    const hasUiLayout = Boolean(
      uiLayout &&
        (uiLayout.blocks.length > 0 || uiLayout.panel?.open || (uiLayout.panel?.blocks.length ?? 0) > 0)
    );
    const metadata: Record<string, unknown> = {
      contentType: hasUiLayout
        ? ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED
        : ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      ...(hasUiLayout && uiLayout ? { uiLayout } : {}),
      planner: {
        intent: result.plan.intent,
        mode: result.plan.mode,
        toolFamilies: result.plan.toolFamilies,
        maxToolRounds: result.plan.maxToolRounds,
        skipTools: result.plan.skipTools,
        toolsOffered: result.toolsOffered ?? 0,
        source: result.plan.plannerSource,
        reasoning: result.plan.reasoning,
        retrievalHits: result.retrieval?.hits.length ?? 0,
        retrievalVectorHits: result.retrieval?.vectorHits ?? 0,
        retrievalTerms: result.retrieval?.terms ?? [],
      },
    };
    if (result.pendingConfirmation) {
      metadata.pendingConfirmation = result.pendingConfirmation;
      assistantText =
        (assistantText ? `${assistantText}\n\n` : '') +
        `Die Aktion **${result.pendingConfirmation.toolName}** erfordert deine Bestätigung.`;
    }

    if (!assistantText.trim() && hasUiLayout && uiLayout) {
      assistantText = uiLayoutToPlainText(uiLayout);
    }

    void recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'chat',
      rawUnits: {
        input_tokens: Math.round(ctx.prompt.length / 4),
        output_tokens: Math.round(assistantText.length / 4),
      },
    });

    return { assistantText, metadata };
  } catch (e) {
    const details = e instanceof Error ? e.message : String(e);
    console.error('[assistant/complete] Claude error', details);
    const err = new Error(`Claude API request failed: ${details}`) as Error & { status?: number };
    err.status = 502;
    throw err;
  }
};
