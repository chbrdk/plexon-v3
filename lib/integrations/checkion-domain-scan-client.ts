import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import {
  checkionApiScanDomainCreate,
  checkionApiScanDomainStatus,
  checkionApiScanDomainSummary,
} from '@/lib/paths/checkion-api';

export type DomainScanPreview = {
  id: string;
  domain: string;
  url: string;
  status: string;
  totalPages: number;
  score: number;
  stats: { errors: number; warnings: number; notices: number; total: number };
  topIssues: Array<{ title: string; count: number }>;
  seoPagesAnalyzed?: number;
};

export type DomainScanStartResult =
  | { ok: true; scanId: string }
  | { ok: false; error: string };

const DOMAIN_TERMINAL = new Set(['complete', 'error', 'cancelled']);

function parseMaxPages(): number {
  const raw = process.env.ASSISTANT_DOMAIN_SCAN_MAX_PAGES?.trim();
  const n = raw ? Number(raw) : 50;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 50;
}

function requireAuthHeaders():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: auth.headers };
}

export async function startCheckionDomainScan(input: {
  url: string;
  checkionProjectId?: string | null;
  maxPages?: number;
}): Promise<DomainScanStartResult> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  const url = input.url.trim();
  if (!url) return { ok: false, error: 'URL fehlt' };

  try {
    const res = await fetch(checkionApiScanDomainCreate(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        url,
        maxPages: input.maxPages ?? parseMaxPages(),
        ...(input.checkionProjectId ? { projectId: input.checkionProjectId } : {}),
      }),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Domain-Scan start: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    const json = JSON.parse(body) as { data?: { id?: string } };
    const scanId = json.data?.id;
    if (!scanId) return { ok: false, error: 'Domain-Scan ohne ID' };
    return { ok: true, scanId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type DomainScanStatusPreview = {
  id: string;
  domain: string;
  status: string;
  progress?: number;
  totalPages?: number;
  score?: number;
  error?: string;
};

export async function fetchCheckionDomainScanStatus(scanId: string): Promise<
  { ok: true; status: DomainScanStatusPreview } | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiScanDomainStatus(scanId), { headers: auth.headers, cache: 'no-store' });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `Domain status: HTTP ${res.status}` };
    const json = JSON.parse(body) as Record<string, unknown>;
    return {
      ok: true,
      status: {
        id: String(json.id ?? scanId),
        domain: String(json.domain ?? ''),
        status: String(json.status ?? 'unknown'),
        progress: json.progress != null ? Number(json.progress) : undefined,
        totalPages: json.totalPages != null ? Number(json.totalPages) : undefined,
        score: json.score != null ? Number(json.score) : undefined,
        error: typeof json.error === 'string' ? json.error : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function mapDomainSummary(
  scanId: string,
  status: DomainScanStatusPreview,
  summaryJson: Record<string, unknown>
): DomainScanPreview {
  const aggregated = (summaryJson.aggregated as Record<string, unknown>) ?? {};
  const issuesAgg = (aggregated.issues as Record<string, unknown>) ?? {};
  const statsRaw = (issuesAgg.stats as Record<string, number>) ?? {};
  const stats = {
    errors: Number(statsRaw.errors ?? 0),
    warnings: Number(statsRaw.warnings ?? 0),
    notices: Number(statsRaw.notices ?? 0),
    total: Number(statsRaw.total ?? 0),
  };
  const systemic = Array.isArray(summaryJson.systemicIssues)
    ? (summaryJson.systemicIssues as Array<Record<string, unknown>>)
    : [];
  const topIssues = systemic.slice(0, 10).map((row) => ({
    title: String(row.title ?? row.issueId ?? 'Issue'),
    count: Number(row.count ?? 0),
  }));
  const seo = (aggregated.seo as Record<string, unknown>) ?? {};
  const url = status.domain ? `https://${status.domain}` : '';

  return {
    id: scanId,
    domain: status.domain,
    url,
    status: status.status,
    totalPages: status.totalPages ?? Number(summaryJson.totalPages ?? 0),
    score: status.score ?? 0,
    stats,
    topIssues,
    seoPagesAnalyzed: seo.pagesAnalyzed != null ? Number(seo.pagesAnalyzed) : undefined,
  };
}

export async function fetchCheckionDomainScanSummary(scanId: string): Promise<
  { ok: true; preview: DomainScanPreview } | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  const statusRes = await fetchCheckionDomainScanStatus(scanId);
  if (!statusRes.ok) return statusRes;

  try {
    const res = await fetch(checkionApiScanDomainSummary(scanId, true), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `Domain summary: HTTP ${res.status}` };
    const json = JSON.parse(body) as Record<string, unknown>;
    return {
      ok: true,
      preview: mapDomainSummary(scanId, statusRes.status, json),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pollCheckionDomainScan(
  scanId: string,
  options: {
    intervalMs?: number;
    maxMs?: number;
    onProgress?: (status: string, progress?: number) => void | Promise<void>;
  } = {}
): Promise<{ ok: true; status: DomainScanStatusPreview } | { ok: false; error: string; lastStatus?: string }> {
  const polled = await pollUntil<DomainScanStatusPreview>({
    intervalMs: options.intervalMs ?? 5000,
    maxMs: options.maxMs ?? 15 * 60 * 1000,
    onTick: async (tick) => {
      if (tick.status) await options.onProgress?.(tick.status, tick.progress);
    },
    fetch: async () => {
      const res = await fetchCheckionDomainScanStatus(scanId);
      if (!res.ok) return { done: true, error: res.error };
      const { status, error, progress } = res.status;
      if (status === 'error') {
        return { done: true, error: error ?? 'Domain-Scan fehlgeschlagen', status, progress };
      }
      if (status === 'cancelled') {
        return { done: true, error: 'Domain-Scan abgebrochen', status, progress };
      }
      if (!DOMAIN_TERMINAL.has(status)) {
        return { done: false, status, progress: progress ?? 20 };
      }
      return { done: true, value: res.status, status, progress: 100 };
    },
  });

  if (!polled.ok) return polled;
  return { ok: true, status: polled.value };
}
