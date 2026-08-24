import { getCheckionServiceApiUrl } from '@/lib/constants';
import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import { pollUntil } from '@/lib/assistant/poll-until';
import { parseGeoEeatJobPreview } from '@/lib/integrations/parse-geo-eeat-job-preview';
import {
  checkionApiGeoEeatJob,
  checkionApiGeoEeatRerunCompetitive,
  checkionApiGeoEeatStart,
  checkionApiGeoEeatStatus,
  checkionApiGeoEeatSuggestQueries,
} from '@/lib/paths/checkion-api';

export type GeoEeatStartResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

export type GeoEeatEeatDimension = {
  score: number;
  reasoning?: string;
};

export type GeoEeatJobPreview = {
  jobId: string;
  url: string;
  status: string;
  overallScore?: number | null;
  /** Citation strength 0–100 from CHECKION presence.solo.citedShare. */
  citedShare?: number | null;
  geoFitnessScore?: number | null;
  eeatScores?: {
    trust?: GeoEeatEeatDimension;
    experience?: GeoEeatEeatDimension;
    expertise?: GeoEeatEeatDimension;
    authoritativeness?: GeoEeatEeatDimension;
  };
  /** GEO fitness narrative from intensive page reading. */
  geoFitnessReasoning?: string;
  /** Gaps called out by GEO fitness (e.g. FAQs, Author, llms.txt). */
  missingGeoElements?: string[];
  competitors?: Array<{
    name: string;
    score?: number | null;
    shareOfVoice?: number | null;
    avgPosition?: number | null;
    mentionCount?: number | null;
  }>;
  keywords?: string[];
  queries?: string[];
  recommendations?: Array<{ title: string; description: string; priority?: number }>;
  citationHighlights?: Array<{ query: string; domain: string; position: number }>;
  citationHighlightsByModel?: Array<{
    modelId: string;
    modelLabel: string;
    citations: Array<{ query: string; domain: string; position: number }>;
    runs?: Array<{
      queryId?: string;
      query: string;
      answerText?: string;
      rawAnswerExcerpt?: string;
      citations: Array<{ domain: string; position: number; context?: string }>;
    }>;
  }>;
  competitiveOnly?: boolean;
};

export type GeoEeatStatusPreview = {
  jobId: string;
  status: string;
  error?: string;
};

const GEO_TERMINAL_STATUSES = new Set(['complete', 'error']);
const GEO_PROGRESS: Record<string, number> = {
  queued: 15,
  running: 55,
  complete: 100,
  error: 100,
};

function geoAuthHeaders():
  | { ok: true; headers: Record<string, string> }
  | { ok: false; error: string } {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return auth;
  return { ok: true, headers: { Authorization: auth.headers.Authorization } };
}

function parseGeoJob(json: Record<string, unknown>, jobId: string): GeoEeatJobPreview {
  return parseGeoEeatJobPreview(json, jobId);
}

export type GeoSuggestQueriesResult =
  | { ok: true; competitors: string[]; queries: string[] }
  | { ok: false; error: string };

export async function suggestCheckionGeoQueries(url: string): Promise<GeoSuggestQueriesResult> {
  const auth = geoAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiGeoEeatSuggestQueries(), {
      method: 'POST',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `GEO suggest: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    const json = JSON.parse(body) as { competitors?: string[]; queries?: string[] };
    return {
      ok: true,
      competitors: Array.isArray(json.competitors) ? json.competitors.map(String) : [],
      queries: Array.isArray(json.queries) ? json.queries.map(String) : [],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function startCheckionGeoEeat(input: {
  url: string;
  projectId?: string | null;
  queries?: string[];
  competitors?: string[];
  runCompetitive?: boolean;
  generateQueries?: boolean;
}): Promise<GeoEeatStartResult> {
  const auth = geoAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiGeoEeatStart(), {
      method: 'POST',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: input.url,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.queries?.length ? { queries: input.queries } : {}),
        ...(input.competitors?.length ? { competitors: input.competitors } : {}),
        ...(input.runCompetitive != null ? { runCompetitive: input.runCompetitive } : {}),
        ...(input.generateQueries != null ? { generateQueries: input.generateQueries } : {}),
      }),
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `GEO start: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    const json = JSON.parse(body) as { jobId?: string; id?: string };
    const jobId = json.jobId ?? json.id;
    if (!jobId) return { ok: false, error: 'GEO ohne jobId' };
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchCheckionGeoEeatStatus(jobId: string): Promise<
  { ok: true; status: GeoEeatStatusPreview } | { ok: false; error: string }
> {
  const auth = geoAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiGeoEeatStatus(jobId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `GEO status: HTTP ${res.status}` };
    }
    const json = JSON.parse(body) as Record<string, unknown>;
    return {
      ok: true,
      status: {
        jobId: String(json.jobId ?? jobId),
        status: String(json.status ?? 'unknown'),
        error: typeof json.error === 'string' ? json.error : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchCheckionGeoEeatJob(jobId: string): Promise<
  { ok: true; job: GeoEeatJobPreview } | { ok: false; error: string }
> {
  const auth = geoAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiGeoEeatJob(jobId), {
      headers: auth.headers,
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, error: `GEO get: HTTP ${res.status}` };
    }
    const json = JSON.parse(body) as Record<string, unknown>;
    return { ok: true, job: parseGeoJob(json, jobId) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function rerunCheckionGeoCompetitive(jobId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const auth = geoAuthHeaders();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const res = await fetch(checkionApiGeoEeatRerunCompetitive(jobId), {
      method: 'POST',
      headers: auth.headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `GEO competitive: HTTP ${res.status} – ${body.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function geoStatusProgress(status: string): number {
  return GEO_PROGRESS[status] ?? 30;
}

export async function pollCheckionGeoEeatJob(
  jobId: string,
  options: {
    intervalMs?: number;
    maxMs?: number;
    onProgress?: (status: string, progress: number) => void | Promise<void>;
  } = {}
): Promise<{ ok: true; job: GeoEeatJobPreview } | { ok: false; error: string; lastStatus?: string }> {
  const poll = await pollUntil<GeoEeatJobPreview>({
    intervalMs: options.intervalMs ?? 3000,
    maxMs: options.maxMs ?? 10 * 60 * 1000,
    onTick: async (tick) => {
      if (tick.status) {
        await options.onProgress?.(tick.status, tick.progress ?? geoStatusProgress(tick.status));
      }
    },
    fetch: async () => {
      const statusRes = await fetchCheckionGeoEeatStatus(jobId);
      if (!statusRes.ok) {
        return { done: true, error: statusRes.error };
      }
      const { status, error } = statusRes.status;
      const progress = geoStatusProgress(status);

      if (status === 'error') {
        return {
          done: true,
          error: error ?? 'GEO-Analyse fehlgeschlagen',
          status,
          progress,
        };
      }

      if (!GEO_TERMINAL_STATUSES.has(status)) {
        return { done: false, status, progress };
      }

      const jobRes = await fetchCheckionGeoEeatJob(jobId);
      if (!jobRes.ok) {
        return { done: true, error: jobRes.error, status, progress };
      }
      return { done: true, value: jobRes.job, status, progress: 100 };
    },
  });

  if (!poll.ok) return poll;
  return { ok: true, job: poll.value };
}

/** @deprecated use checkionApiGeoEeatStart — kept for tests referencing geoBase */
export function geoBase(): string {
  return getCheckionServiceApiUrl().replace(/\/+$/, '');
}
