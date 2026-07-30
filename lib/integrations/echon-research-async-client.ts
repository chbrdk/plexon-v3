import {
  echonResearchRunsPath,
  ECHON_PLAYBOOK_RESEARCH_DEPTH,
  getEchonApiBaseUrl,
  getEchonResearchStartRequestTimeoutMs,
  type EchonReportResearchDepth,
} from '@/lib/paths/echon-api';
import { mapEchonHttpFailure } from '@/lib/integrations/echon-service-fetch';
import { getEchonServiceToken } from '@/lib/paths/echon-api';

export type EchonResearchEnqueueResult =
  | { ok: true; threadId: string; runId: string }
  | { ok: false; reason: string; detail?: string };

function buildEnqueueBody(
  query: string,
  depth: EchonReportResearchDepth,
  clientCapabilities?: { ui?: string; source?: string }
) {
  return {
    query,
    thread_id: null,
    run_mode: 'full',
    filters: { time_window_days: 30 },
    options: {
      research_depth: depth,
      top_k_signals: depth === 'fast' ? 12 : 30,
      top_k_waves: depth === 'fast' ? 6 : 10,
      sources: ['internal'],
    },
    client_capabilities: {
      ui: clientCapabilities?.ui ?? 'plexon-playbook-v1',
      mode: 'async-enqueue',
      ...(clientCapabilities?.source ? { source: clientCapabilities.source } : {}),
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ENQUEUE_RETRY_MS = [0, 15_000, 45_000];

export async function enqueueEchonResearchRun(
  query: string,
  options?: {
    depth?: EchonReportResearchDepth;
    apiBaseUrl?: string;
    clientUi?: string;
    clientSource?: string;
  }
): Promise<EchonResearchEnqueueResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, reason: 'echon_empty_query' };

  const base = options?.apiBaseUrl?.replace(/\/$/, '') ?? getEchonApiBaseUrl();
  const url = `${base}${echonResearchRunsPath()}`;
  const token = getEchonServiceToken();
  const depth = options?.depth ?? ECHON_PLAYBOOK_RESEARCH_DEPTH;
  const timeoutMs = getEchonResearchStartRequestTimeoutMs();

  for (let attempt = 0; attempt < ENQUEUE_RETRY_MS.length; attempt += 1) {
    if (attempt > 0) await sleep(ENQUEUE_RETRY_MS[attempt] ?? 60_000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          buildEnqueueBody(trimmed, depth, {
            ui: options?.clientUi,
            source: options?.clientSource,
          })
        ),
        signal: controller.signal,
      });

      if (res.status === 503 && attempt < ENQUEUE_RETRY_MS.length - 1) continue;

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return { ok: false, reason: mapEchonHttpFailure(res.status, detail), detail: detail.slice(0, 500) };
      }

      const data = (await res.json()) as { run_id?: string; thread_id?: string };
      const threadId = (data.thread_id ?? '').trim();
      const runId = (data.run_id ?? '').trim();
      if (!threadId) return { ok: false, reason: 'echon_enqueue_missing_thread_id' };
      return { ok: true, threadId, runId };
    } catch (err) {
      if (attempt < ENQUEUE_RETRY_MS.length - 1) continue;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        reason: isAbort ? 'echon_fetch_timeout' : 'echon_fetch_failed',
        detail: err instanceof Error ? err.message : String(err),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: 'echon_http_503' };
}
