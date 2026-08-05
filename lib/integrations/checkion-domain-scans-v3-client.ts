/**
 * CHECKION v3 domain crawls via `/api/domain-scans`.
 * Spec: collection-test-flow.md Wave 8A
 */

import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import {
  checkionApiDomainScanDetail,
  checkionApiDomainScanIssues,
  checkionApiDomainScans,
} from '@/lib/paths/checkion-api';
import type { IssueGateSignals } from '@/lib/collection-test-flow';

export type CheckionDomainScanSummary = {
  id: string;
  projectId: string;
  url: string;
  status: string;
  overallScore: number | null;
  pageCount?: number;
  error?: string;
};

const TERMINAL = new Set(['completed', 'complete', 'failed', 'error', 'cancelled']);

function requireAuthHeaders():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: auth.headers };
}

function parseDomain(body: unknown): CheckionDomainScanSummary | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  const overallScore =
    typeof o.overallScore === 'number' && Number.isFinite(o.overallScore)
      ? o.overallScore
      : typeof o.score === 'number' && Number.isFinite(o.score)
        ? o.score
        : null;
  return {
    id,
    projectId: typeof o.projectId === 'string' ? o.projectId : '',
    url: typeof o.url === 'string' ? o.url : typeof o.domain === 'string' ? o.domain : '',
    status: typeof o.status === 'string' ? o.status : 'queued',
    overallScore,
    pageCount: typeof o.pageCount === 'number' ? o.pageCount : undefined,
    error: typeof o.error === 'string' ? o.error : undefined,
  };
}

export async function startCheckionDomainScanV3(input: {
  projectId: string;
  url: string;
  maxPages?: number;
  waitForCompletion?: boolean;
}): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  const url = input.url.trim();
  const projectId = input.projectId.trim();
  if (!url) return { ok: false, error: 'URL fehlt' };
  if (!projectId) return { ok: false, error: 'Checkion projectId fehlt' };

  try {
    const res = await fetch(checkionApiDomainScans(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        projectId,
        url,
        waitForCompletion: input.waitForCompletion === true,
        ...(typeof input.maxPages === 'number' ? { maxPages: input.maxPages } : {}),
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `CHECKION domain-scans start: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION domain-scans: ungültiges JSON' };
    }
    const scan = parseDomain(json);
    if (!scan) return { ok: false, error: 'CHECKION domain-scans: Antwort ohne id' };
    return { ok: true, scan };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchCheckionDomainScanV3Detail(
  domainScanId: string
): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const res = await fetch(checkionApiDomainScanDetail(domainScanId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `CHECKION domain detail: HTTP ${res.status}` };
    const json = JSON.parse(text) as unknown;
    const scan = parseDomain(json);
    if (!scan) return { ok: false, error: 'CHECKION domain detail: ungültig' };
    return { ok: true, scan };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pollCheckionDomainScanV3(
  domainScanId: string,
  options?: { intervalMs?: number; maxMs?: number }
): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string }
> {
  return pollUntil({
    intervalMs: options?.intervalMs ?? 3000,
    maxMs: options?.maxMs ?? 12 * 60 * 1000,
    fetch: async () => {
      const res = await fetchCheckionDomainScanV3Detail(domainScanId);
      if (!res.ok) return { done: true, error: res.error, status: 'error' };
      const status = res.scan.status.toLowerCase();
      if (TERMINAL.has(status)) {
        return { done: true, value: res.scan, status };
      }
      return { done: false, status, progress: status === 'running' ? 50 : 10 };
    },
  });
}

export async function runCheckionDomainScanV3(input: {
  projectId: string;
  url: string;
  maxPages?: number;
}): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string; scan?: CheckionDomainScanSummary }
> {
  const started = await startCheckionDomainScanV3({
    ...input,
    waitForCompletion: false,
  });
  if (!started.ok) return started;
  if (TERMINAL.has(started.scan.status.toLowerCase())) {
    return { ok: true, scan: started.scan };
  }
  const polled = await pollCheckionDomainScanV3(started.scan.id);
  if (!polled.ok) return { ok: false, error: polled.error, scan: started.scan };
  return { ok: true, scan: polled.value };
}

export async function fetchCheckionDomainScanV3Issues(
  domainScanId: string
): Promise<
  | { ok: true; signals: IssueGateSignals }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const res = await fetch(checkionApiDomainScanIssues(domainScanId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CHECKION domain issues: HTTP ${res.status}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION domain issues: ungültiges JSON' };
    }
    const rawItems = Array.isArray(json)
      ? json
      : json && typeof json === 'object' && Array.isArray((json as { items?: unknown }).items)
        ? (json as { items: unknown[] }).items
        : [];
    let criticalCount = 0;
    let seriousCount = 0;
    const ruleIds: string[] = [];
    for (const row of rawItems) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const severity = typeof o.severity === 'string' ? o.severity : 'minor';
      if (severity === 'critical') criticalCount += 1;
      if (severity === 'serious') seriousCount += 1;
      if (typeof o.ruleId === 'string' && o.ruleId) ruleIds.push(o.ruleId);
    }
    return {
      ok: true,
      signals: {
        criticalCount,
        seriousCount,
        issueCount: rawItems.length,
        ruleIds,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
