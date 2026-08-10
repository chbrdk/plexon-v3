/**
 * Brandion Measured evaluate via sync analysis-runs (Collection Flow Wave 24).
 * @see specs/domain/collection-test-flow.md — Family D
 */

import { getBrandionServiceApiUrl } from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
import { apiBrandionGuidelineAnalysisRuns } from '@/lib/paths/brandion-api';

export type BrandionAnalysisRunSummary = {
  id: string;
  guidelineId: string;
  status: string;
  passed: number;
  failed: number;
  skipped: number;
  error?: string;
};

export type BrandionAnalysisRunDetail = BrandionAnalysisRunSummary & {
  observations?: unknown[];
  results?: Array<{ passed?: boolean }>;
};

export type CreateBrandionFixtureRunResult =
  | { ok: true; run: BrandionAnalysisRunDetail }
  | { ok: false; error: string; status?: number };

function requireAuth():
  | { ok: true; base: string; headers: Record<string, string> }
  | { ok: false; error: string } {
  const base = getBrandionServiceApiUrl()?.replace(/\/+$/, '') ?? '';
  const secret = process.env.PLEXON_SERVICE_SECRET?.trim() ?? '';
  if (!base) return { ok: false, error: 'BRANDION_URL / BRANDION_API_URL missing on PLEXON' };
  if (!secret) return { ok: false, error: 'PLEXON_SERVICE_SECRET missing on PLEXON' };
  return {
    ok: true,
    base,
    headers: {
      'Content-Type': 'application/json',
      [PLEXON_SERVICE_SECRET_HEADER]: secret,
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    },
  };
}

function parseRun(body: unknown): BrandionAnalysisRunDetail | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) return null;
  return {
    id,
    guidelineId: typeof o.guidelineId === 'string' ? o.guidelineId : '',
    status: typeof o.status === 'string' ? o.status : 'failed',
    passed: typeof o.passed === 'number' ? o.passed : 0,
    failed: typeof o.failed === 'number' ? o.failed : 0,
    skipped: typeof o.skipped === 'number' ? o.skipped : 0,
    error: typeof o.error === 'string' ? o.error : undefined,
    observations: Array.isArray(o.observations) ? o.observations : [],
    results: Array.isArray(o.results) ? (o.results as Array<{ passed?: boolean }>) : [],
  };
}

/** Sync fixture measure + evaluate on a Brandion guideline. */
export async function createBrandionFixtureAnalysisRun(input: {
  guidelineId: string;
  fixtureId: string;
  plexonUserId?: string | null;
}): Promise<CreateBrandionFixtureRunResult> {
  const auth = requireAuth();
  if (!auth.ok) return auth;

  const guidelineId = input.guidelineId.trim();
  const fixtureId = input.fixtureId.trim() || 'demo-landing-pass';
  if (!guidelineId) return { ok: false, error: 'guidelineId required' };

  const headers = { ...auth.headers };
  if (input.plexonUserId?.trim()) {
    headers['X-Plexon-User-Id'] = input.plexonUserId.trim();
  }

  try {
    const res = await fetch(apiBrandionGuidelineAnalysisRuns(guidelineId), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: { kind: 'fixture', fixtureId },
        includePending: false,
      }),
      cache: 'no-store',
    });
    const text = await res.text().catch(() => '');
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err =
        json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
          ? (json as { error: string }).error
          : text.slice(0, 200) || `HTTP ${res.status}`;
      return { ok: false, error: err, status: res.status };
    }
    const run = parseRun(json);
    if (!run) return { ok: false, error: 'brandion_analysis_run_invalid' };
    return { ok: true, run };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'brandion_analysis_run_failed',
    };
  }
}
