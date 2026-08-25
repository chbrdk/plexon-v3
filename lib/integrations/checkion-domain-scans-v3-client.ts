/**
 * CHECKION v3 domain crawls via `/api/domain-scans`.
 * Spec: collection-test-flow.md Wave 8A
 */

import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import {
  checkionApiDomainScanDetail,
  checkionApiDomainScanIssues,
  checkionApiDomainScanOverview,
  checkionApiDomainScans,
} from '@/lib/paths/checkion-api';
import type { IssueGateSignals } from '@/lib/collection-test-flow';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  mapDomainScanV3ToPreview,
  type DomainScanV3IssueRow,
} from '@/lib/integrations/map-domain-scan-v3-preview';
import { mapDomainOverviewToDistributions } from '@/lib/integrations/map-domain-scan-distributions';
import { domainScanPollMaxMs } from '@/lib/integrations/domain-scan-poll-budget';
export type CheckionDomainScanSummary = {
  id: string;
  projectId: string;
  url: string;
  status: string;
  overallScore: number | null;
  pageCount?: number;
  error?: string;
  issueStats?: { errors: number; warnings: number; notices: number; total: number } | null;
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
  const scanRaw =
    o.scan && typeof o.scan === 'object' ? (o.scan as Record<string, unknown>) : o;
  const id = typeof scanRaw.id === 'string' ? scanRaw.id : typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  const overallScore =
    typeof scanRaw.overallScore === 'number' && Number.isFinite(scanRaw.overallScore)
      ? scanRaw.overallScore
      : typeof scanRaw.score === 'number' && Number.isFinite(scanRaw.score)
        ? scanRaw.score
        : null;
  const statsRaw =
    scanRaw.issueStats && typeof scanRaw.issueStats === 'object'
      ? (scanRaw.issueStats as Record<string, unknown>)
      : null;
  const issueStats = statsRaw
    ? {
        errors: Number(statsRaw.errors ?? 0),
        warnings: Number(statsRaw.warnings ?? 0),
        notices: Number(statsRaw.notices ?? 0),
        total: Number(statsRaw.total ?? 0),
      }
    : null;
  return {
    id,
    projectId: typeof scanRaw.projectId === 'string' ? scanRaw.projectId : '',
    url:
      typeof scanRaw.url === 'string'
        ? scanRaw.url
        : typeof scanRaw.rootUrl === 'string'
          ? scanRaw.rootUrl
          : typeof scanRaw.domain === 'string'
            ? scanRaw.domain
            : '',
    status: typeof scanRaw.status === 'string' ? scanRaw.status : 'queued',
    overallScore,
    pageCount: typeof scanRaw.pageCount === 'number' ? scanRaw.pageCount : undefined,
    error: typeof scanRaw.error === 'string' ? scanRaw.error : undefined,
    issueStats,
  };
}

export async function listCheckionDomainScansV3(projectId?: string): Promise<
  | { ok: true; scans: CheckionDomainScanSummary[] }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const url = new URL(checkionApiDomainScans());
    if (projectId?.trim()) url.searchParams.set('projectId', projectId.trim());
    const res = await fetch(url.toString(), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CHECKION domain-scans list: HTTP ${res.status}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION domain-scans list: ungültiges JSON' };
    }
    const rawItems = Array.isArray(json)
      ? json
      : json && typeof json === 'object' && Array.isArray((json as { items?: unknown }).items)
        ? ((json as { items: unknown[] }).items)
        : [];
    const scans = rawItems
      .map((row) => parseDomain(row))
      .filter((s): s is CheckionDomainScanSummary => Boolean(s));
    return { ok: true, scans };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function hostKey(raw: string): string {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]?.toLowerCase() ?? '';
  }
}

const COMPLETED = new Set(['completed', 'complete']);
const FAILED = new Set(['failed', 'error', 'cancelled']);

function isCompletedStatus(status: string): boolean {
  return COMPLETED.has(String(status ?? '').toLowerCase());
}

function isFailedStatus(status: string): boolean {
  return FAILED.has(String(status ?? '').toLowerCase());
}

/** Best-effort match when EQC stored scanId is missing/unknown. */
export async function findCheckionDomainScanIdByUrl(input: {
  url?: string | null;
  domain?: string | null;
  score?: number | null;
  projectId?: string | null;
  /** Prefer terminal completed scans (for stuck-run reconcile). */
  preferCompleted?: boolean;
}): Promise<string | null> {
  const want = hostKey(input.url || input.domain || '');
  if (!want) return null;
  const listed = await listCheckionDomainScansV3(input.projectId?.trim() || undefined);
  if (!listed.ok || !listed.scans.length) return null;
  let sameHost = listed.scans.filter((s) => hostKey(s.url) === want);
  if (!sameHost.length) return null;
  if (input.preferCompleted) {
    const done = sameHost.filter((s) => isCompletedStatus(s.status));
    if (done.length) sameHost = done;
  }
  const score = typeof input.score === 'number' && Number.isFinite(input.score) ? input.score : null;
  if (score != null) {
    const scored = sameHost.find(
      (s) => s.overallScore != null && Math.round(s.overallScore) === Math.round(score)
    );
    if (scored) return scored.id;
  }
  const withPages = sameHost.find((s) => (s.pageCount ?? 0) > 0);
  return (withPages ?? sameHost[0])?.id ?? null;
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
  options?: {
    intervalMs?: number;
    maxMs?: number;
    /** Used to scale default poll budget when maxMs is omitted. */
    maxPages?: number;
    onProgress?: (status: string, progress?: number) => void | Promise<void>;
  }
): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string }
> {
  let lastScan: CheckionDomainScanSummary | undefined;
  const polled = await pollUntil({
    intervalMs: options?.intervalMs ?? 3000,
    maxMs: options?.maxMs ?? domainScanPollMaxMs(options?.maxPages),
    onTick: async (tick) => {
      if (tick.status) {
        await options?.onProgress?.(tick.status, tick.progress);
      }
    },
    fetch: async () => {
      const res = await fetchCheckionDomainScanV3Detail(domainScanId);
      if (!res.ok) return { done: true, error: res.error, status: 'error' };
      lastScan = res.scan;
      const status = String(res.scan.status ?? '').toLowerCase();
      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        return {
          done: true,
          error: res.scan.error ?? `Domain-Scan ${status}`,
          status,
        };
      }
      if (TERMINAL.has(status)) {
        return { done: true, value: res.scan, status };
      }
      const progress =
        status === 'running' || status === 'scanning'
          ? 50
          : status === 'queued'
            ? 10
            : undefined;
      return { done: false, status, progress };
    },
  });
  if (!polled.ok) {
    const bits: string[] = [];
    if (polled.lastStatus) bits.push(`Status ${polled.lastStatus}`);
    if (lastScan?.pageCount != null) bits.push(`${lastScan.pageCount} Seiten`);
    return {
      ok: false,
      error: bits.length ? `${polled.error} (${bits.join(', ')})` : polled.error,
    };
  }
  return { ok: true, scan: polled.value };
}

/** Detail + issues → DomainScanPreview for EQC / assistant report model. */
export async function fetchCheckionDomainScanV3Preview(
  domainScanId: string
): Promise<{ ok: true; preview: DomainScanPreview } | { ok: false; error: string }> {
  const detail = await fetchCheckionDomainScanV3Detail(domainScanId);
  if (!detail.ok) return detail;
  const issuesRes = await fetchCheckionDomainScanV3Issues(domainScanId);
  const issueRows: DomainScanV3IssueRow[] = issuesRes.ok
    ? issuesRes.items.map((o) => ({
        title: typeof o.title === 'string' ? o.title : undefined,
        ruleId: typeof o.ruleId === 'string' ? o.ruleId : undefined,
        severity: typeof o.severity === 'string' ? o.severity : undefined,
        affectedCount: typeof o.affectedCount === 'number' ? o.affectedCount : undefined,
        count: typeof o.count === 'number' ? o.count : undefined,
      }))
    : [];
  const preview = mapDomainScanV3ToPreview({
    scan: detail.scan,
    issues: issueRows,
    issueStats: detail.scan.issueStats,
  });
  const overviewRes = await fetchCheckionDomainScanV3Overview(domainScanId);
  if (overviewRes.ok) {
    const distributions = mapDomainOverviewToDistributions(overviewRes.overview);
    if (distributions) preview.distributions = distributions;
  }
  return { ok: true, preview };
}

/** Best-effort DomainOverview JSON for corpus distributions. */
export async function fetchCheckionDomainScanV3Overview(
  domainScanId: string
): Promise<{ ok: true; overview: unknown } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const res = await fetch(checkionApiDomainScanOverview(domainScanId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CHECKION domain overview: HTTP ${res.status}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION domain overview: ungültiges JSON' };
    }
    const overview =
      json && typeof json === 'object' && 'overview' in (json as object)
        ? (json as { overview: unknown }).overview
        : json;
    return { ok: true, overview };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function runCheckionDomainScanV3(input: {
  projectId: string;
  url: string;
  maxPages?: number;
  /** Adopt an already-started CHECKION scan (skip duplicate POST). */
  existingScanId?: string;
  /** Fired once the scan id is known (start or adopt) — persist before long poll. */
  onStarted?: (scan: CheckionDomainScanSummary) => void | Promise<void>;
}): Promise<
  | { ok: true; scan: CheckionDomainScanSummary }
  | { ok: false; error: string; scan?: CheckionDomainScanSummary }
> {
  const existingId = input.existingScanId?.trim();
  if (existingId) {
    const detail = await fetchCheckionDomainScanV3Detail(existingId);
    if (!detail.ok) return { ok: false, error: detail.error };
    await input.onStarted?.(detail.scan);
    const status = String(detail.scan.status ?? '').toLowerCase();
    if (isFailedStatus(status)) {
      return {
        ok: false,
        error: detail.scan.error ?? `Domain-Scan ${status}`,
        scan: detail.scan,
      };
    }
    if (isCompletedStatus(status)) {
      return { ok: true, scan: detail.scan };
    }
    const polled = await pollCheckionDomainScanV3(detail.scan.id, {
      maxPages: input.maxPages,
    });
    if (!polled.ok) return { ok: false, error: polled.error, scan: detail.scan };
    return { ok: true, scan: polled.scan };
  }

  const started = await startCheckionDomainScanV3({
    projectId: input.projectId,
    url: input.url,
    maxPages: input.maxPages,
    waitForCompletion: false,
  });
  if (!started.ok) return started;
  await input.onStarted?.(started.scan);
  if (TERMINAL.has(String(started.scan.status ?? '').toLowerCase())) {
    if (isFailedStatus(String(started.scan.status ?? ''))) {
      return {
        ok: false,
        error: started.scan.error ?? `Domain-Scan ${started.scan.status}`,
        scan: started.scan,
      };
    }
    return { ok: true, scan: started.scan };
  }
  const polled = await pollCheckionDomainScanV3(started.scan.id, {
    maxPages: input.maxPages,
  });
  if (!polled.ok) return { ok: false, error: polled.error, scan: started.scan };
  return { ok: true, scan: polled.scan };
}

export async function fetchCheckionDomainScanV3Issues(
  domainScanId: string
): Promise<
  | { ok: true; signals: IssueGateSignals; items: Array<Record<string, unknown>> }
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
    const items: Array<Record<string, unknown>> = [];
    for (const row of rawItems) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      items.push(o);
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
      items,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
