import { buildMarketResearchQuery } from '@/lib/assistant/playbooks/run-market-to-audience';
import {
  emptyEchonMarketContext,
  fetchEchonMarketContext,
  type EchonMarketContext,
} from '@/lib/integrations/echon-market-context';
import {
  enqueueEchonResearchViaMcp,
  fetchEchonMarketContextViaMcp,
  isEchonMcpResearchAvailable,
} from '@/lib/integrations/echon-mcp-research-client';
import { enqueueEchonResearchRun } from '@/lib/integrations/echon-research-async-client';
import { EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS } from '@/lib/paths/assistant-workflows';
import {
  ECHON_PLAYBOOK_RESEARCH_DEPTH,
  getEchonQuickCheckApiBaseCandidates,
  getEchonResearchPollIntervalMs,
  getEchonResearchPollRequestTimeoutMs,
  isEchonDnsOrNetworkError,
  isEchonServerIntegrationConfigured,
} from '@/lib/paths/echon-api';

export type EchonQuickCheckResearchHandle = {
  query: string;
  threadId: string;
  runId: string;
  startedAt: number;
  /** Set when polling via direct FastAPI; omitted when only MCP is configured on PLEXON. */
  apiBaseUrl?: string;
  pollViaMcp?: boolean;
};

export type EchonQuickCheckResearchStartResult =
  | { ok: true; handle: EchonQuickCheckResearchHandle }
  | { ok: false; reason: string; detail?: string; userMessage: string };

const ENQUEUE_REASON_DE: Record<string, string> = {
  echon_empty_query: 'Leere Research-Query',
  echon_enqueue_missing_thread_id: 'ECHON antwortete ohne thread_id',
  echon_fetch_timeout: 'Timeout beim ECHON-Enqueue',
  echon_fetch_failed: 'Netzwerkfehler zur ECHON API',
  echon_http_401: 'ECHON API: nicht autorisiert (401)',
  echon_http_403: 'ECHON API: Zugriff verweigert (403)',
  echon_http_500: 'ECHON API: interner Fehler (500)',
  echon_http_502: 'ECHON API: Gateway-Fehler (502)',
  echon_http_503: 'ECHON Research-Kapazität belegt — später erneut versuchen',
  echon_mcp_error: 'ECHON MCP: Research-Start fehlgeschlagen',
  echon_mcp_url_missing: 'ECHON_MCP_URL fehlt auf PLEXON',
};

export function isEchonQuickCheckResearchEnabled(): boolean {
  return (
    isEchonMcpResearchAvailable() ||
    isEchonServerIntegrationConfigured() ||
    getEchonQuickCheckApiBaseCandidates().length > 0
  );
}

export function echonQuickCheckMissingEnvMessage(): string {
  return 'ECHON nicht erreichbar — PLEXON-Container sieht echon-mcp/echon-v2-api nicht. Docker-Netzwerk verbinden oder ECHON_API_URL=https://echon.projects-a.plygrnd.tech/echon setzen.';
}

export function formatEchonEnqueueUserMessage(reason: string, detail?: string): string {
  if (isEchonDnsOrNetworkError(detail)) {
    const host = detail?.match(/ENOTFOUND (\S+)/)?.[1];
    if (host) {
      return `PLEXON erreicht ${host} nicht (Docker-DNS). ECHON-Stack mit PLEXON vernetzen oder ECHON_API_URL auf die öffentliche URL setzen.`;
    }
    return 'PLEXON erreicht ECHON nicht (Netzwerk/DNS). Interne Hostnamen nur im gemeinsamen Docker-Netz — sonst öffentliche ECHON-URL in ECHON_API_URL.';
  }
  const base = ENQUEUE_REASON_DE[reason] ?? `ECHON-Enqueue fehlgeschlagen (${reason})`;
  if (!detail?.trim()) return base;
  const snippet = detail.trim().slice(0, 160);
  return `${base}: ${snippet}`;
}

async function enqueueQuickCheckViaApi(
  query: string,
  apiBaseUrl: string
): ReturnType<typeof enqueueEchonResearchRun> {
  return enqueueEchonResearchRun(query, {
    depth: ECHON_PLAYBOOK_RESEARCH_DEPTH,
    apiBaseUrl,
    clientUi: 'plexon-quick-check-v1',
    clientSource: 'event_quick_check',
  });
}

export function buildQuickCheckMarketResearchQuery(projectName: string, domain?: string): string {
  const base = buildMarketResearchQuery(projectName, domain);
  return `${base} Kompakt für Quick Check / Event-Demo.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startEchonQuickCheckResearch(
  projectName: string,
  url: string
): Promise<EchonQuickCheckResearchStartResult> {
  let domain: string | undefined;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = undefined;
  }

  const query = buildQuickCheckMarketResearchQuery(projectName, domain);
  const mcpAvailable = isEchonMcpResearchAvailable();
  const apiCandidates = getEchonQuickCheckApiBaseCandidates();

  let enqueued:
    | { ok: true; threadId: string; runId: string }
    | { ok: false; reason: string; detail?: string } = {
    ok: false,
    reason: 'echon_mcp_url_missing',
  };
  let pollViaMcp = false;
  let usedApiBaseUrl: string | undefined;

  if (mcpAvailable) {
    const mcpResult = await enqueueEchonResearchViaMcp(query, {
      depth: ECHON_PLAYBOOK_RESEARCH_DEPTH,
    });
    if (mcpResult.ok) {
      enqueued = mcpResult;
      pollViaMcp = true;
    } else {
      enqueued = mcpResult;
    }
  }

  if (!enqueued.ok) {
    for (const apiBase of apiCandidates) {
      const apiResult = await enqueueQuickCheckViaApi(query, apiBase);
      if (apiResult.ok) {
        enqueued = apiResult;
        pollViaMcp = false;
        usedApiBaseUrl = apiBase;
        break;
      }
      enqueued = apiResult;
    }
  }

  if (!enqueued.ok) {
    console.warn('[event-quick-check] ECHON enqueue failed', {
      reason: enqueued.reason,
      detail: enqueued.detail,
      mcpAvailable,
      apiCandidates,
      queryPreview: query.slice(0, 120),
    });
    return {
      ok: false,
      reason: enqueued.reason,
      detail: enqueued.detail,
      userMessage: formatEchonEnqueueUserMessage(enqueued.reason, enqueued.detail),
    };
  }

  console.info('[event-quick-check] ECHON research enqueued', {
    threadId: enqueued.threadId,
    runId: enqueued.runId,
    via: pollViaMcp ? 'mcp' : 'api',
    apiBaseUrl: usedApiBaseUrl,
  });

  return {
    ok: true,
    handle: {
      query,
      threadId: enqueued.threadId,
      runId: enqueued.runId,
      startedAt: Date.now(),
      apiBaseUrl: usedApiBaseUrl,
      pollViaMcp,
    },
  };
}

export async function finalizeEchonQuickCheckResearch(
  handle: EchonQuickCheckResearchHandle,
  options?: {
    maxWaitMs?: number;
    onPoll?: (detail: string) => void | Promise<void>;
  }
): Promise<EchonMarketContext & { runId?: string; query: string }> {
  const pollInterval = getEchonResearchPollIntervalMs();
  const pollTimeout = getEchonResearchPollRequestTimeoutMs();
  const deadline =
    handle.startedAt + (options?.maxWaitMs ?? EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS);
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    await options?.onPoll?.(`Poll ${attempt}…`);
    const ctx = handle.pollViaMcp
      ? await fetchEchonMarketContextViaMcp(handle.threadId)
      : await fetchEchonMarketContext(handle.threadId, pollTimeout, handle.apiBaseUrl);
    if (ctx.available) {
      return { ...ctx, runId: handle.runId, query: handle.query };
    }
    await sleep(pollInterval);
  }

  const final = handle.pollViaMcp
    ? await fetchEchonMarketContextViaMcp(handle.threadId)
    : await fetchEchonMarketContext(handle.threadId, pollTimeout, handle.apiBaseUrl);
  if (final.available) {
    return { ...final, runId: handle.runId, query: handle.query };
  }

  return {
    ...emptyEchonMarketContext('echon_poll_timeout'),
    threadId: handle.threadId,
    runId: handle.runId,
    query: handle.query,
  };
}
