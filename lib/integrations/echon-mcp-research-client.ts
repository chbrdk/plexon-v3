import { callCheckionMcpTool } from '@/lib/checkion-mcp-client';
import { getEchonMcpUrl } from '@/lib/constants';
import {
  parseEchonThreadToMarketContext,
  type EchonMarketContext,
} from '@/lib/integrations/echon-market-context';
import type { EchonReportResearchDepth } from '@/lib/paths/echon-api';

export type EchonMcpResearchEnqueueResult =
  | { ok: true; threadId: string; runId: string }
  | { ok: false; reason: string; detail?: string };

function parseMcpJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractEnqueueIds(data: unknown): { threadId: string; runId: string } | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.error) return null;
  const threadId = String(record.thread_id ?? record.threadId ?? '').trim();
  const runId = String(record.run_id ?? record.runId ?? '').trim();
  if (!threadId) return null;
  return { threadId, runId: runId || threadId };
}

export function isEchonMcpResearchAvailable(): boolean {
  return Boolean(getEchonMcpUrl());
}

export async function enqueueEchonResearchViaMcp(
  query: string,
  options?: { depth?: EchonReportResearchDepth }
): Promise<EchonMcpResearchEnqueueResult> {
  const mcpUrl = getEchonMcpUrl();
  if (!mcpUrl) return { ok: false, reason: 'echon_mcp_url_missing' };

  const trimmed = query.trim();
  if (!trimmed) return { ok: false, reason: 'echon_empty_query' };

  const raw = await callCheckionMcpTool(mcpUrl, 'echon.research_run_start', {
    query: trimmed,
    depth: options?.depth ?? 'fast',
  });

  const parsed = parseMcpJsonPayload(raw);
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const err = String((parsed as { error: unknown }).error);
    return { ok: false, reason: 'echon_mcp_error', detail: err };
  }

  const ids = extractEnqueueIds(parsed);
  if (!ids) {
    return {
      ok: false,
      reason: 'echon_enqueue_missing_thread_id',
      detail: raw.slice(0, 300),
    };
  }

  return { ok: true, threadId: ids.threadId, runId: ids.runId };
}

export async function fetchEchonMarketContextViaMcp(threadId: string): Promise<EchonMarketContext> {
  const mcpUrl = getEchonMcpUrl();
  if (!mcpUrl) {
    return { available: false, reason: 'echon_mcp_url_missing' };
  }

  const raw = await callCheckionMcpTool(mcpUrl, 'echon.research_thread_get', {
    thread_id: threadId,
  });

  const parsed = parseMcpJsonPayload(raw);
  if (!parsed) {
    return { available: false, reason: 'echon_mcp_parse_failed', threadId };
  }
  if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
    return {
      available: false,
      reason: 'echon_mcp_error',
      threadId,
    };
  }

  return parseEchonThreadToMarketContext(parsed, threadId);
}
