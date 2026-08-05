/**
 * CHECKION single-page scans via contracts `/api/scans` (not legacy `/api/scan`).
 * Spec: collection-test-flow.md Wave 1
 */

import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import { checkionApiScanDetail, checkionApiScans } from '@/lib/paths/checkion-api';

export type CheckionScanSummary = {
  id: string;
  projectId: string;
  mode: string;
  url: string;
  status: string;
  overallScore: number | null;
  issueCount?: number;
  error?: string;
  platformProjectId?: string | null;
};

export type StartSingleScanResult =
  | { ok: true; scan: CheckionScanSummary }
  | { ok: false; error: string };

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

function requireAuthHeaders():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: auth.headers };
}

function parseScan(body: unknown): CheckionScanSummary | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  const overallScore =
    typeof o.overallScore === 'number' && Number.isFinite(o.overallScore)
      ? o.overallScore
      : o.overallScore === null
        ? null
        : null;
  return {
    id,
    projectId: typeof o.projectId === 'string' ? o.projectId : '',
    mode: typeof o.mode === 'string' ? o.mode : 'single',
    url: typeof o.url === 'string' ? o.url : '',
    status: typeof o.status === 'string' ? o.status : 'queued',
    overallScore,
    issueCount: typeof o.issueCount === 'number' ? o.issueCount : undefined,
    error: typeof o.error === 'string' ? o.error : undefined,
    platformProjectId:
      typeof o.platformProjectId === 'string' ? o.platformProjectId : null,
  };
}

export async function startCheckionSingleScan(input: {
  projectId: string;
  url: string;
  platformProjectId?: string | null;
  waitForCompletion?: boolean;
}): Promise<StartSingleScanResult> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  const url = input.url.trim();
  const projectId = input.projectId.trim();
  if (!url) return { ok: false, error: 'URL fehlt' };
  if (!projectId) return { ok: false, error: 'Checkion projectId fehlt' };

  try {
    const res = await fetch(checkionApiScans(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        projectId,
        mode: 'single',
        url,
        waitForCompletion: input.waitForCompletion === true,
        ...(input.platformProjectId
          ? { platformProjectId: input.platformProjectId }
          : {}),
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `CHECKION scans start: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION scans start: ungültiges JSON' };
    }
    const scan = parseScan(json);
    if (!scan) return { ok: false, error: 'CHECKION scans start: Antwort ohne id' };
    return { ok: true, scan };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchCheckionScanDetail(
  scanId: string
): Promise<{ ok: true; scan: CheckionScanSummary } | { ok: false; error: string }> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiScanDetail(scanId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CHECKION scan detail: HTTP ${res.status}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION scan detail: ungültiges JSON' };
    }
    const scan = parseScan(json);
    if (!scan) return { ok: false, error: 'CHECKION scan detail: ungültig' };
    return { ok: true, scan };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pollCheckionSingleScan(
  scanId: string,
  options?: { intervalMs?: number; maxMs?: number }
): Promise<
  | { ok: true; scan: CheckionScanSummary }
  | { ok: false; error: string; lastStatus?: string }
> {
  return pollUntil({
    intervalMs: options?.intervalMs ?? 2500,
    maxMs: options?.maxMs ?? 8 * 60 * 1000,
    fetch: async () => {
      const res = await fetchCheckionScanDetail(scanId);
      if (!res.ok) {
        return { done: true, error: res.error, status: 'error' };
      }
      const { scan } = res;
      const status = scan.status.toLowerCase();
      if (TERMINAL.has(status)) {
        // Always return the scan — deriveCollectionVerdict maps failed/cancelled.
        return { done: true, value: scan, status };
      }
      return { done: false, status, progress: status === 'running' ? 50 : 10 };
    },
  });
}

/** Start single scan and poll until terminal (or return immediately if already terminal). */
export async function runCheckionSingleScan(input: {
  projectId: string;
  url: string;
  platformProjectId?: string | null;
}): Promise<
  | { ok: true; scan: CheckionScanSummary }
  | { ok: false; error: string; scan?: CheckionScanSummary }
> {
  const started = await startCheckionSingleScan({
    projectId: input.projectId,
    url: input.url,
    platformProjectId: input.platformProjectId,
    waitForCompletion: false,
  });
  if (!started.ok) return started;

  if (TERMINAL.has(started.scan.status.toLowerCase())) {
    return { ok: true, scan: started.scan };
  }

  const polled = await pollCheckionSingleScan(started.scan.id);
  if (!polled.ok) {
    return { ok: false, error: polled.error, scan: started.scan };
  }
  return { ok: true, scan: polled.value };
}
