import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  fetchCheckionDomainScanStatus,
  fetchCheckionDomainScanSummary,
  pollCheckionDomainScan,
  type DomainScanPreview,
} from '@/lib/integrations/checkion-domain-scan-client';
import {
  checkionApiProjectDomainScanAll,
  checkionApiProjectDomainSummaryAll,
} from '@/lib/paths/checkion-api';

function requireAuth():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: auth.headers };
}

export type CheckionProjectDeepScanStarted = {
  ownScanId: string | null;
  competitorScanIds: Record<string, string>;
};

export type StartCheckionProjectDomainScanAllResult =
  | { ok: true; started: CheckionProjectDeepScanStarted }
  | { ok: false; error: string };

/** CHECKION POST /api/projects/{id}/domain-scan-all — mirrors project UI "scan all". */
export async function startCheckionProjectDomainScanAll(input: {
  projectId: string;
  maxPages?: number;
  classifyPageTopics?: boolean;
  skipUnchangedPages?: boolean;
  aiFillProjectMetadata?: boolean;
}): Promise<StartCheckionProjectDomainScanAllResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const projectId = input.projectId.trim();
  if (!projectId) return { ok: false, error: 'CHECKION projectId fehlt' };

  try {
    const res = await fetch(
      checkionApiProjectDomainScanAll(projectId, {
        maxPages: input.maxPages,
        classifyPageTopics: input.classifyPageTopics,
        skipUnchangedPages: input.skipUnchangedPages,
        aiFillProjectMetadata: input.aiFillProjectMetadata,
      }),
      { method: 'POST', headers: auth.headers, cache: 'no-store' }
    );
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `CHECKION domain-scan-all: HTTP ${res.status} – ${body.slice(0, 120)}`,
      };
    }

    const json = JSON.parse(body) as {
      success?: boolean;
      data?: {
        own?: { scanId?: string } | null;
        competitors?: Record<string, { scanId?: string }>;
      };
    };
    const data = json.data ?? {};
    const competitorScanIds: Record<string, string> = {};
    for (const [domain, row] of Object.entries(data.competitors ?? {})) {
      const scanId = row?.scanId?.trim();
      if (scanId) competitorScanIds[domain] = scanId;
    }

    return {
      ok: true,
      started: {
        ownScanId: data.own?.scanId?.trim() || null,
        competitorScanIds,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type CheckionProjectDomainSummaryRow = {
  domain: string;
  scanId?: string;
  status?: string;
  score?: number | null;
  totalPages?: number | null;
};

export type CheckionProjectDomainSummaryAll = {
  own: CheckionProjectDomainSummaryRow | null;
  competitors: Record<string, CheckionProjectDomainSummaryRow>;
};

export type FetchCheckionProjectDomainSummaryAllResult =
  | { ok: true; summary: CheckionProjectDomainSummaryAll }
  | { ok: false; error: string };

function mapSummaryRow(domain: string, row: Record<string, unknown> | null | undefined): CheckionProjectDomainSummaryRow | null {
  if (!row || typeof row !== 'object') return null;
  return {
    domain,
    scanId: typeof row.scanId === 'string' ? row.scanId : undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
    score: row.score != null ? Number(row.score) : null,
    totalPages: row.totalPages != null ? Number(row.totalPages) : null,
  };
}

/** CHECKION GET /api/projects/{id}/domain-summary-all — for report after scans complete. */
export async function fetchCheckionProjectDomainSummaryAll(
  projectId: string
): Promise<FetchCheckionProjectDomainSummaryAllResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiProjectDomainSummaryAll(projectId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `CHECKION domain-summary-all: HTTP ${res.status} – ${body.slice(0, 120)}`,
      };
    }
    const json = JSON.parse(body) as {
      success?: boolean;
      data?: {
        own?: Record<string, unknown> | null;
        competitors?: Record<string, Record<string, unknown>>;
      };
    };
    const data = json.data ?? {};
    const ownDomain =
      typeof data.own?.domain === 'string'
        ? data.own.domain
        : typeof data.own?.url === 'string'
          ? data.own.url
          : 'own';
    const competitors: Record<string, CheckionProjectDomainSummaryRow> = {};
    for (const [domain, row] of Object.entries(data.competitors ?? {})) {
      const mapped = mapSummaryRow(domain, row);
      if (mapped) competitors[domain] = mapped;
    }
    return {
      ok: true,
      summary: {
        own: mapSummaryRow(ownDomain, data.own ?? null),
        competitors,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type PollCheckionProjectDeepScansResult =
  | {
      ok: true;
      ownScan?: DomainScanPreview;
      competitorScans: Record<string, DomainScanPreview>;
      failed: string[];
    }
  | { ok: false; error: string };

const DOMAIN_TERMINAL = new Set(['complete', 'error', 'cancelled']);

/** Poll all scan IDs from domain-scan-all until terminal; fetch summaries for completed scans. */
export async function pollCheckionProjectDeepScans(
  started: CheckionProjectDeepScanStarted,
  options?: {
    onProgress?: (detail: string, progress?: number) => void | Promise<void>;
  }
): Promise<PollCheckionProjectDeepScansResult> {
  const entries: Array<{ label: string; scanId: string }> = [];
  if (started.ownScanId) entries.push({ label: 'own', scanId: started.ownScanId });
  for (const [domain, scanId] of Object.entries(started.competitorScanIds)) {
    entries.push({ label: domain, scanId });
  }
  if (!entries.length) {
    return { ok: false, error: 'Keine Scan-IDs von domain-scan-all' };
  }

  const failed: string[] = [];
  let ownScan: DomainScanPreview | undefined;
  const competitorScans: Record<string, DomainScanPreview> = {};

  for (const { label, scanId } of entries) {
    await options?.onProgress?.(`Scan ${label}: wird gestartet…`);
    const polled = await pollCheckionDomainScan(scanId, {
      onProgress: async (status, progress) => {
        await options?.onProgress?.(`Scan ${label}: ${status}`, progress);
      },
    });
    if (!polled.ok) {
      failed.push(`${label}: ${polled.error}`);
      continue;
    }
    const summary = await fetchCheckionDomainScanSummary(scanId);
    if (!summary.ok) {
      failed.push(`${label}: ${summary.error}`);
      continue;
    }
    if (label === 'own') {
      ownScan = summary.preview;
    } else {
      competitorScans[label] = summary.preview;
    }
  }

  if (!ownScan && !Object.keys(competitorScans).length) {
    return { ok: false, error: failed.join('; ') || 'Kein Scan erfolgreich' };
  }

  return { ok: true, ownScan, competitorScans, failed };
}

export type CollectDeepScanPreviewsResult =
  | {
      ok: true;
      allComplete: boolean;
      progress: { complete: number; total: number; detail: string };
      ownScan?: DomainScanPreview;
      competitorScans: Record<string, DomainScanPreview>;
      failed: string[];
    }
  | { ok: false; error: string };

/**
 * Non-blocking status + summaries for scans that already finished.
 * Used between gates so Komplettscan HTTP requests do not wait hours for CHECKION crawls.
 */
export async function collectCompletedDeepScanPreviews(
  started: CheckionProjectDeepScanStarted
): Promise<CollectDeepScanPreviewsResult> {
  const progress = await fetchCheckionProjectDeepScanProgress(started);
  const entries: Array<{ label: string; scanId: string }> = [];
  if (started.ownScanId) entries.push({ label: 'own', scanId: started.ownScanId });
  for (const [domain, scanId] of Object.entries(started.competitorScanIds)) {
    entries.push({ label: domain, scanId });
  }
  if (!entries.length) {
    return { ok: false, error: 'Keine Scan-IDs von domain-scan-all' };
  }

  const failed: string[] = [];
  let ownScan: DomainScanPreview | undefined;
  const competitorScans: Record<string, DomainScanPreview> = {};

  await Promise.all(
    entries.map(async ({ label, scanId }) => {
      const status = await fetchCheckionDomainScanStatus(scanId);
      if (!status.ok) {
        failed.push(`${label}: ${status.error}`);
        return;
      }
      if (!DOMAIN_TERMINAL.has(status.status.status) || status.status.status !== 'complete') {
        return;
      }
      const summary = await fetchCheckionDomainScanSummary(scanId);
      if (!summary.ok) {
        failed.push(`${label}: ${summary.error}`);
        return;
      }
      if (label === 'own') {
        ownScan = summary.preview;
      } else {
        competitorScans[label] = summary.preview;
      }
    })
  );

  const allComplete = progress.complete >= progress.total && progress.total > 0;
  return {
    ok: true,
    allComplete,
    progress,
    ownScan,
    competitorScans,
    failed,
  };
}

/** Lightweight status check without waiting for completion (for UI progress bars). */
export async function fetchCheckionProjectDeepScanProgress(
  started: CheckionProjectDeepScanStarted
): Promise<{ complete: number; total: number; detail: string }> {
  const scanIds = [
    ...(started.ownScanId ? [started.ownScanId] : []),
    ...Object.values(started.competitorScanIds),
  ];
  if (!scanIds.length) return { complete: 0, total: 0, detail: 'Keine Scans' };

  let complete = 0;
  let sumProgress = 0;
  for (const scanId of scanIds) {
    const status = await fetchCheckionDomainScanStatus(scanId);
    if (!status.ok) continue;
    if (DOMAIN_TERMINAL.has(status.status.status)) complete += 1;
    sumProgress += status.status.progress ?? (DOMAIN_TERMINAL.has(status.status.status) ? 100 : 0);
  }
  const avg = Math.round(sumProgress / scanIds.length);
  return {
    complete,
    total: scanIds.length,
    detail: `${complete}/${scanIds.length} Scans${avg ? ` (${avg}%)` : ''}`,
  };
}
