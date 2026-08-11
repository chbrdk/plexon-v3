import type { AssistantIntent } from '@/lib/assistant/intent-router';
import type { AssistantHandlerContext, AssistantHandlerResult } from '@/lib/assistant/handlers/context';

type IntentDispatcher = (
  ctx: AssistantHandlerContext,
  intent: AssistantIntent
) => Promise<AssistantHandlerResult>;

const LAZY_HANDLERS: Record<AssistantIntent['type'], () => Promise<IntentDispatcher>> = {
  capabilities: async () => {
    const { handleCapabilitiesIntent } = await import('@/lib/assistant/handlers/capabilities');
    return (ctx) => handleCapabilitiesIntent(ctx);
  },
  ui_showcase: async () => {
    const { handleUiShowcaseIntent } = await import('@/lib/assistant/handlers/capabilities');
    return (ctx) => handleUiShowcaseIntent(ctx);
  },
  create_project: async () => {
    const { handleCreateProjectIntent } = await import('@/lib/assistant/handlers/create-platform-project');
    return (ctx, intent) => handleCreateProjectIntent(ctx, intent as Extract<AssistantIntent, { type: 'create_project' }>);
  },
  create_audion_project: async () => {
    const { handleCreateAudionProjectIntent } = await import('@/lib/assistant/handlers/create-product-project');
    return (ctx, intent) =>
      handleCreateAudionProjectIntent(ctx, intent as Extract<AssistantIntent, { type: 'create_audion_project' }>);
  },
  create_checkion_project: async () => {
    const { handleCreateCheckionProjectIntent } = await import('@/lib/assistant/handlers/create-product-project');
    return (ctx, intent) =>
      handleCreateCheckionProjectIntent(ctx, intent as Extract<AssistantIntent, { type: 'create_checkion_project' }>);
  },
  quick_scan: async () => {
    const { handleQuickScanIntent } = await import('@/lib/assistant/handlers/quick-scan');
    return (ctx, intent) => handleQuickScanIntent(ctx, intent as Extract<AssistantIntent, { type: 'quick_scan' }>);
  },
  domain_scan: async () => {
    const { handleDomainScanIntent } = await import('@/lib/assistant/handlers/domain-scan');
    return (ctx, intent) => handleDomainScanIntent(ctx, intent as Extract<AssistantIntent, { type: 'domain_scan' }>);
  },
  pagespeed_check: async () => {
    const { handlePagespeedCheckIntent } = await import('@/lib/assistant/handlers/pagespeed-check');
    return (ctx, intent) =>
      handlePagespeedCheckIntent(ctx, intent as Extract<AssistantIntent, { type: 'pagespeed_check' }>);
  },
  contrast_check: async () => {
    const { handleContrastCheckIntent } = await import('@/lib/assistant/handlers/contrast-check');
    return (ctx, intent) =>
      handleContrastCheckIntent(ctx, intent as Extract<AssistantIntent, { type: 'contrast_check' }>);
  },
  readability_check: async () => {
    const { handleReadabilityCheckIntent } = await import('@/lib/assistant/handlers/readability-check');
    return (ctx, intent) =>
      handleReadabilityCheckIntent(ctx, intent as Extract<AssistantIntent, { type: 'readability_check' }>);
  },
  scan_summarize: async () => {
    const { handleScanSummarizeIntent } = await import('@/lib/assistant/handlers/scan-summarize');
    return (ctx, intent) =>
      handleScanSummarizeIntent(ctx, intent as Extract<AssistantIntent, { type: 'scan_summarize' }>);
  },
  run_playbook: async () => {
    const { handleRunPlaybookIntent } = await import('@/lib/assistant/handlers/run-playbook');
    return (ctx, intent) => handleRunPlaybookIntent(ctx, intent as Extract<AssistantIntent, { type: 'run_playbook' }>);
  },
  ssl_check: async () => {
    const { handleSslCheckIntent } = await import('@/lib/assistant/handlers/ssl-check');
    return (ctx, intent) => handleSslCheckIntent(ctx, intent as Extract<AssistantIntent, { type: 'ssl_check' }>);
  },
  wayback_check: async () => {
    const { handleWaybackCheckIntent } = await import('@/lib/assistant/handlers/wayback-check');
    return (ctx, intent) => handleWaybackCheckIntent(ctx, intent as Extract<AssistantIntent, { type: 'wayback_check' }>);
  },
  sync_diagnose: async () => {
    const { handleSyncDiagnoseIntent } = await import('@/lib/assistant/handlers/sync-diagnose');
    return (ctx, intent) => handleSyncDiagnoseIntent(ctx, intent as Extract<AssistantIntent, { type: 'sync_diagnose' }>);
  },
  persona_bootstrap: async () => {
    const { handlePersonaBootstrapIntent } = await import('@/lib/assistant/handlers/persona-bootstrap');
    return (ctx, intent) =>
      handlePersonaBootstrapIntent(ctx, intent as Extract<AssistantIntent, { type: 'persona_bootstrap' }>);
  },
  journey_outline: async () => {
    const { handleJourneyOutlineIntent } = await import('@/lib/assistant/handlers/journey-outline');
    return (ctx, intent) =>
      handleJourneyOutlineIntent(ctx, intent as Extract<AssistantIntent, { type: 'journey_outline' }>);
  },
  geo_analysis: async () => {
    const { handleGeoAnalysisIntent } = await import('@/lib/assistant/handlers/geo-analysis');
    return (ctx, intent) => handleGeoAnalysisIntent(ctx, intent as Extract<AssistantIntent, { type: 'geo_analysis' }>);
  },
  start_research: async () => {
    const { handleStartResearchIntent } = await import('@/lib/assistant/handlers/start-research');
    return (ctx, intent) => handleStartResearchIntent(ctx, intent as Extract<AssistantIntent, { type: 'start_research' }>);
  },
  project_status: async () => {
    const { handleProjectStatusIntent } = await import('@/lib/assistant/handlers/project-status');
    return (ctx, intent) => handleProjectStatusIntent(ctx, intent as Extract<AssistantIntent, { type: 'project_status' }>);
  },
  free_chat: async () => {
    const { handleFreeChatIntent } = await import('@/lib/assistant/handlers/free-chat');
    return (ctx, intent) => handleFreeChatIntent(ctx, intent as Extract<AssistantIntent, { type: 'free_chat' }>);
  },
};

const handlerCache = new Map<AssistantIntent['type'], IntentDispatcher>();

async function resolveHandler(type: AssistantIntent['type']): Promise<IntentDispatcher> {
  const cached = handlerCache.get(type);
  if (cached) return cached;
  const handler = await LAZY_HANDLERS[type]();
  handlerCache.set(type, handler);
  return handler;
}

export function listRegisteredIntentTypes(): AssistantIntent['type'][] {
  return Object.keys(LAZY_HANDLERS) as AssistantIntent['type'][];
}

export async function dispatchAssistantIntent(
  ctx: AssistantHandlerContext,
  intent: AssistantIntent
): Promise<AssistantHandlerResult> {
  const handler = await resolveHandler(intent.type);
  return handler(ctx, intent);
}
