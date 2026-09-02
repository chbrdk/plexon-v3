/**
 * Wave 2 Epic D — ensure CHECKION B2C/B2B deep-scan corpus for Vaillant MaFo demo.
 * @see specs/domain/vaillant-mafo-wave2-demo.md
 */

import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  checkionDomainScanHostKey,
  listCheckionDomainScansV3,
  pollCheckionDomainScanV3,
  startCheckionDomainScanV3,
  type CheckionDomainScanSummary,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  VAILLANT_GROUP_B2B_FACHPARTNER_URL,
  VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  isVaillantGroupCollection,
} from '@/lib/demo/vaillant-group-mafo';

export const VAILLANT_MAFO_CORPUS_MIN_PAGES = 5;
export const VAILLANT_MAFO_CORPUS_MAX_PAGES_STAGING = 30;
/** Optional max age for corpus reuse; `null` = reuse any completed scan with enough pages. */
export const VAILLANT_MAFO_CORPUS_FRESH_MS = 7 * 24 * 60 * 60 * 1000;
export const VAILLANT_MAFO_CORPUS_DEFAULT_FRESH_MS: number | null = null;

export type VaillantCorpusSpine = 'b2c' | 'b2b';

export type VaillantCorpusSpineConfig = {
  spine: VaillantCorpusSpine;
  label: string;
  host: string;
  seedUrl: string;
};

export const VAILLANT_CORPUS_SPINES: Record<VaillantCorpusSpine, VaillantCorpusSpineConfig> = {
  b2c: {
    spine: 'b2c',
    label: 'B2C',
    host: 'vaillant.de',
    seedUrl: VAILLANT_GROUP_B2C_WAERMEPUMPE_URL,
  },
  b2b: {
    spine: 'b2b',
    label: 'B2B',
    host: 'myvaillantpro.de',
    seedUrl: VAILLANT_GROUP_B2B_FACHPARTNER_URL,
  },
};

export type EnsureVaillantCorpusSpineResult = {
  ok: boolean;
  spine: VaillantCorpusSpine;
  scanId?: string;
  pageCount?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

export type EnsureVaillantCheckionCorpusResult = {
  ok: boolean;
  platformProjectId?: string;
  checkionProjectId?: string;
  spines: EnsureVaillantCorpusSpineResult[];
  error?: string;
};

const COMPLETED = new Set(['completed', 'complete']);
const IN_PROGRESS = new Set(['queued', 'running', 'scanning', 'pending']);

function isCompletedStatus(status: string): boolean {
  return COMPLETED.has(String(status ?? '').toLowerCase());
}

function isInProgressStatus(status: string): boolean {
  return IN_PROGRESS.has(String(status ?? '').toLowerCase());
}

function scanTimestampMs(scan: CheckionDomainScanSummary): number | null {
  const raw = scan.completedAt ?? scan.startedAt;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function scanSatisfiesCorpus(
  scan: CheckionDomainScanSummary,
  input: { host: string; minPages: number; freshMs?: number | null; nowMs?: number },
): boolean {
  if (checkionDomainScanHostKey(scan.url) !== input.host) return false;
  if (!isCompletedStatus(scan.status)) return false;
  if ((scan.pageCount ?? 0) < input.minPages) return false;
  const freshMs = input.freshMs;
  if (freshMs == null || !Number.isFinite(freshMs)) return true;
  const ts = scanTimestampMs(scan);
  if (ts == null) return true;
  const now = input.nowMs ?? Date.now();
  return now - ts <= freshMs;
}

export function resolveVaillantCorpusForceRefresh(input?: {
  forceRefresh?: boolean;
}): boolean {
  if (input?.forceRefresh) return true;
  const env = process.env.VAILLANT_MAFO_CORPUS_FORCE_REFRESH?.trim().toLowerCase();
  return env === '1' || env === 'true' || env === 'yes';
}

export function pickBestCorpusScan(
  scans: CheckionDomainScanSummary[],
  host: string,
): CheckionDomainScanSummary | null {
  const sameHost = scans.filter((s) => checkionDomainScanHostKey(s.url) === host);
  if (!sameHost.length) return null;
  const completed = sameHost.filter((s) => isCompletedStatus(s.status));
  const pool = completed.length ? completed : sameHost;
  return (
    pool
      .slice()
      .sort((a, b) => {
        const pages = (b.pageCount ?? 0) - (a.pageCount ?? 0);
        if (pages !== 0) return pages;
        const bt = scanTimestampMs(b) ?? 0;
        const at = scanTimestampMs(a) ?? 0;
        return bt - at;
      })[0] ?? null
  );
}

export function logVaillantCorpusReady(
  spine: VaillantCorpusSpineConfig,
  scan: CheckionDomainScanSummary,
): void {
  console.log(
    `[vaillant-mafo] CHECKION ${spine.label} corpus: domain-${scan.id} ${scan.status} pages=${scan.pageCount ?? 0}`,
  );
}

export async function ensureVaillantCorpusSpine(input: {
  checkionProjectId: string;
  spine: VaillantCorpusSpine;
  minPages?: number;
  maxPages?: number;
  /** Max age for reuse; `null` reuses any completed scan with enough pages (demo default). */
  freshMs?: number | null;
  forceRefresh?: boolean;
  waitForCompletion?: boolean;
  /** When set, poll at most this long (ms) even if waitForCompletion is true. */
  pollMaxMs?: number;
}): Promise<EnsureVaillantCorpusSpineResult> {
  const config = VAILLANT_CORPUS_SPINES[input.spine];
  const minPages = input.minPages ?? VAILLANT_MAFO_CORPUS_MIN_PAGES;
  const maxPages = input.maxPages ?? VAILLANT_MAFO_CORPUS_MAX_PAGES_STAGING;
  const freshMs =
    input.freshMs !== undefined ? input.freshMs : VAILLANT_MAFO_CORPUS_DEFAULT_FRESH_MS;
  const forceRefresh = resolveVaillantCorpusForceRefresh(input);
  const waitForCompletion = input.waitForCompletion !== false;

  const listed = await listCheckionDomainScansV3(input.checkionProjectId);
  if (!listed.ok) {
    return { ok: false, spine: input.spine, error: listed.error };
  }

  const existing = pickBestCorpusScan(listed.scans, config.host);
  if (
    !forceRefresh &&
    existing &&
    scanSatisfiesCorpus(existing, { host: config.host, minPages, freshMs })
  ) {
    logVaillantCorpusReady(config, existing);
    return {
      ok: true,
      spine: input.spine,
      scanId: existing.id,
      pageCount: existing.pageCount,
      skipped: true,
      reason: 'existing_corpus',
    };
  }

  if (existing && isInProgressStatus(existing.status)) {
    if (!waitForCompletion) {
      console.log(
        `[vaillant-mafo] CHECKION ${config.label} corpus: domain-${existing.id} in progress (no wait)`,
      );
      return {
        ok: true,
        spine: input.spine,
        scanId: existing.id,
        pageCount: existing.pageCount,
        skipped: true,
        reason: 'in_progress',
      };
    }
    const polled = await pollCheckionDomainScanV3(existing.id, {
      maxPages,
      maxMs: input.pollMaxMs,
    });
    if (
      polled.ok &&
      scanSatisfiesCorpus(polled.scan, { host: config.host, minPages, freshMs: null })
    ) {
      logVaillantCorpusReady(config, polled.scan);
      return {
        ok: true,
        spine: input.spine,
        scanId: polled.scan.id,
        pageCount: polled.scan.pageCount,
      };
    }
    return {
      ok: false,
      spine: input.spine,
      scanId: existing.id,
      error: polled.ok ? 'Corpus scan completed but pageCount below minimum' : polled.error,
    };
  }

  const started = await startCheckionDomainScanV3({
    projectId: input.checkionProjectId,
    url: config.seedUrl,
    maxPages,
  });
  if (!started.ok) {
    return { ok: false, spine: input.spine, error: started.error };
  }

  if (scanSatisfiesCorpus(started.scan, { host: config.host, minPages, freshMs: null })) {
    logVaillantCorpusReady(config, started.scan);
    return {
      ok: true,
      spine: input.spine,
      scanId: started.scan.id,
      pageCount: started.scan.pageCount,
    };
  }

  if (!waitForCompletion) {
    console.log(
      `[vaillant-mafo] CHECKION ${config.label} corpus: started domain-${started.scan.id} (no wait)`,
    );
    return {
      ok: true,
      spine: input.spine,
      scanId: started.scan.id,
      pageCount: started.scan.pageCount,
      reason: 'started',
    };
  }

  const polled = await pollCheckionDomainScanV3(started.scan.id, {
    maxPages,
    maxMs: input.pollMaxMs,
  });
  if (!polled.ok) {
    console.warn(
      `[vaillant-mafo] CHECKION ${config.label} corpus: poll timeout/error — ${polled.error}`,
    );
    return {
      ok: false,
      spine: input.spine,
      scanId: started.scan.id,
      error: polled.error,
    };
  }

  if (!scanSatisfiesCorpus(polled.scan, { host: config.host, minPages, freshMs: null })) {
    return {
      ok: false,
      spine: input.spine,
      scanId: polled.scan.id,
      pageCount: polled.scan.pageCount,
      error: `Corpus scan completed with ${polled.scan.pageCount ?? 0} pages (min ${minPages})`,
    };
  }

  logVaillantCorpusReady(config, polled.scan);
  return {
    ok: true,
    spine: input.spine,
    scanId: polled.scan.id,
    pageCount: polled.scan.pageCount,
  };
}

export function spinesForMafoFlowKind(kind: 'uc1' | 'uc2'): VaillantCorpusSpine[] {
  return kind === 'uc2' ? ['b2c', 'b2b'] : ['b2c'];
}

export async function ensureVaillantCheckionCorpus(input: {
  platformProjectId?: string;
  checkionProjectId?: string;
  spines?: VaillantCorpusSpine[];
  freshMs?: number | null;
  forceRefresh?: boolean;
  waitForCompletion?: boolean;
  pollMaxMs?: number;
}): Promise<EnsureVaillantCheckionCorpusResult> {
  const platformProjectId = (input.platformProjectId ?? VAILLANT_GROUP_PLATFORM_PROJECT_ID).trim();
  if (!isVaillantGroupCollection(platformProjectId)) {
    return { ok: false, spines: [], error: 'Not the Vaillant Group Collection.' };
  }

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return {
      ok: true,
      platformProjectId,
      spines: [],
      error: `CHECKION not configured — skipping corpus bootstrap (${auth.error})`,
    };
  }

  const checkionProjectId =
    input.checkionProjectId?.trim() ||
    (await getExternalProjectId(platformProjectId, 'checkion'));
  if (!checkionProjectId) {
    return {
      ok: false,
      platformProjectId,
      spines: [],
      error: 'CHECKION mirror project id missing for Vaillant Group Collection.',
    };
  }

  const spines = input.spines ?? (['b2c', 'b2b'] as VaillantCorpusSpine[]);
  const results: EnsureVaillantCorpusSpineResult[] = [];
  for (const spine of spines) {
    results.push(
      await ensureVaillantCorpusSpine({
        checkionProjectId,
        spine,
        freshMs: input.freshMs,
        forceRefresh: input.forceRefresh,
        waitForCompletion: input.waitForCompletion,
        pollMaxMs: input.pollMaxMs,
      }),
    );
  }

  const ok = results.every((r) => r.ok);
  return { ok, platformProjectId, checkionProjectId, spines: results };
}

export function documentHasDomainScanNode(
  nodes: Array<{ kind?: string }> | undefined,
): boolean {
  return Boolean(nodes?.some((n) => n.kind === 'domain_scan'));
}
