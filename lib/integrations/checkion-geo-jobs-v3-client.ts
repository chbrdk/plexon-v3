/**
 * CHECKION v3 GEO jobs via `/api/geo-jobs`.
 * Spec: collection-test-flow.md Wave 8B
 */

import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import { checkionApiGeoJobDetail, checkionApiGeoJobs } from '@/lib/paths/checkion-api';
import type { GeoGateSignals } from '@/lib/collection-test-flow';

export type CheckionGeoJobSummary = {
  id: string;
  projectId: string;
  url: string;
  status: string;
  overallScore: number | null;
  citedShare: number | null;
  geoFitness: number | null;
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

function hostBrand(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const leaf = host.split('.')[0] ?? host;
    return leaf || host || 'brand';
  } catch {
    return url.trim() || 'brand';
  }
}

/** Fallback prompts when node text is empty and Checkion has no Knowledge Pack seeds. */
export function defaultGeoQueries(input: { url?: string; companyName?: string }): string[] {
  const brand = (input.companyName?.trim() || hostBrand(input.url ?? '')).trim() || 'brand';
  return [
    `What is ${brand}?`,
    `Is ${brand} recommended?`,
    `${brand} vs alternatives`,
  ];
}

function parseSignals(body: unknown): GeoGateSignals & {
  id: string;
  projectId: string;
  url: string;
  status: string;
  overallScore: number | null;
  error?: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const jobRaw =
    root.job && typeof root.job === 'object'
      ? (root.job as Record<string, unknown>)
      : root;
  const id = typeof jobRaw.id === 'string' ? jobRaw.id : typeof root.jobId === 'string' ? root.jobId : null;
  if (!id) return null;

  const citedShare =
    typeof jobRaw.citedShare === 'number' && Number.isFinite(jobRaw.citedShare)
      ? jobRaw.citedShare
      : null;
  const overallScore =
    typeof jobRaw.overallScore === 'number' && Number.isFinite(jobRaw.overallScore)
      ? jobRaw.overallScore
      : null;

  let geoFitness: number | null = null;
  const eeat = root.eeat;
  if (eeat && typeof eeat === 'object') {
    const g = (eeat as Record<string, unknown>).geoFitness;
    if (typeof g === 'number' && Number.isFinite(g)) geoFitness = g;
  }
  if (geoFitness == null && overallScore != null) geoFitness = overallScore;

  return {
    id,
    projectId: typeof jobRaw.projectId === 'string' ? jobRaw.projectId : '',
    url: typeof jobRaw.url === 'string' ? jobRaw.url : '',
    status: typeof jobRaw.status === 'string' ? jobRaw.status : 'queued',
    overallScore,
    citedShare,
    geoFitness,
    error: typeof jobRaw.error === 'string' ? jobRaw.error : undefined,
  };
}

function toSummary(
  parsed: NonNullable<ReturnType<typeof parseSignals>>
): CheckionGeoJobSummary {
  return {
    id: parsed.id,
    projectId: parsed.projectId,
    url: parsed.url,
    status: parsed.status,
    overallScore: parsed.overallScore,
    citedShare: parsed.citedShare,
    geoFitness: parsed.geoFitness,
    error: parsed.error,
  };
}

export async function startCheckionGeoJobV3(input: {
  projectId: string;
  platformProjectId?: string;
  url?: string;
  companyName?: string;
  queries?: string[];
  includePageScan?: boolean;
}): Promise<
  | { ok: true; job: CheckionGeoJobSummary }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  const projectId = input.projectId.trim();
  if (!projectId) return { ok: false, error: 'Checkion projectId fehlt' };

  const url = input.url?.trim() || '';
  const companyName = input.companyName?.trim() || '';
  if (!url && !companyName) {
    return { ok: false, error: 'GEO: URL oder companyName fehlt' };
  }

  const queries =
    input.queries && input.queries.length > 0
      ? input.queries
      : defaultGeoQueries({ url, companyName });

  try {
    const res = await fetch(checkionApiGeoJobs(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({
        projectId,
        ...(input.platformProjectId ? { platformProjectId: input.platformProjectId } : {}),
        ...(url ? { url } : {}),
        ...(companyName ? { companyName } : {}),
        queries,
        waitForCompletion: false,
        ...(input.includePageScan === true ? { includePageScan: true } : {}),
      }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `CHECKION geo-jobs start: HTTP ${res.status} – ${text.slice(0, 160)}`,
      };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: 'CHECKION geo-jobs: ungültiges JSON' };
    }
    const parsed = parseSignals(json);
    if (!parsed) return { ok: false, error: 'CHECKION geo-jobs: Antwort ohne id' };
    return { ok: true, job: toSummary(parsed) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchCheckionGeoJobV3Detail(
  jobId: string
): Promise<
  | { ok: true; job: CheckionGeoJobSummary; signals: GeoGateSignals }
  | { ok: false; error: string }
> {
  const auth = requireAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const res = await fetch(checkionApiGeoJobDetail(jobId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `CHECKION geo detail: HTTP ${res.status}` };
    const json = JSON.parse(text) as unknown;
    const parsed = parseSignals(json);
    if (!parsed) return { ok: false, error: 'CHECKION geo detail: ungültig' };
    const job = toSummary(parsed);
    return {
      ok: true,
      job,
      signals: { citedShare: job.citedShare, geoFitness: job.geoFitness },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pollCheckionGeoJobV3(
  jobId: string,
  options?: { intervalMs?: number; maxMs?: number }
): Promise<
  | { ok: true; job: CheckionGeoJobSummary; signals: GeoGateSignals }
  | { ok: false; error: string }
> {
  return pollUntil({
    intervalMs: options?.intervalMs ?? 4000,
    maxMs: options?.maxMs ?? 12 * 60 * 1000,
    fetch: async () => {
      const res = await fetchCheckionGeoJobV3Detail(jobId);
      if (!res.ok) return { done: true, error: res.error, status: 'error' };
      const status = res.job.status.toLowerCase();
      if (TERMINAL.has(status)) {
        return { done: true, value: { job: res.job, signals: res.signals }, status };
      }
      return { done: false, status, progress: status === 'running' ? 50 : 10 };
    },
  }).then((r) => {
    if (!r.ok) return { ok: false as const, error: r.error };
    return { ok: true as const, job: r.value.job, signals: r.value.signals };
  });
}

export async function runCheckionGeoJobV3(input: {
  projectId: string;
  platformProjectId?: string;
  url?: string;
  companyName?: string;
  queries?: string[];
  includePageScan?: boolean;
}): Promise<
  | { ok: true; job: CheckionGeoJobSummary; signals: GeoGateSignals }
  | { ok: false; error: string; job?: CheckionGeoJobSummary }
> {
  const started = await startCheckionGeoJobV3(input);
  if (!started.ok) return started;
  if (TERMINAL.has(started.job.status.toLowerCase())) {
    return {
      ok: true,
      job: started.job,
      signals: { citedShare: started.job.citedShare, geoFitness: started.job.geoFitness },
    };
  }
  const polled = await pollCheckionGeoJobV3(started.job.id);
  if (!polled.ok) return { ok: false, error: polled.error, job: started.job };
  return { ok: true, job: polled.job, signals: polled.signals };
}
