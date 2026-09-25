/**
 * CHECKION Gegentest / run-delta client (Enterprise E3).
 * Spec: checkion-v3/specs/api/scan-run-delta.md
 */

import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  checkionApiDomainScanDelta,
  checkionApiGeoJobDelta,
  checkionApiScanDelta,
} from '@/lib/paths/checkion-api';

export type CheckionScanDeltaFinding = {
  key: string;
  ruleId?: string;
  title?: string;
  severity?: string;
};

export type CheckionScanDeltaScore = {
  kind: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  max?: number;
};

export type CheckionScanDeltaResult = {
  kind: 'single' | 'deep' | 'geo';
  currentId: string;
  previousId: string;
  urlSet: string[];
  findings: {
    new: CheckionScanDeltaFinding[];
    gone: CheckionScanDeltaFinding[];
    same: CheckionScanDeltaFinding[];
  };
  scores: CheckionScanDeltaScore[];
  measurement?: 'recall' | 'live';
};

export type FetchCheckionDeltaResult =
  | { ok: true; delta: CheckionScanDeltaResult }
  | { ok: false; error: string; status?: number };

async function fetchDeltaJson(url: string): Promise<FetchCheckionDeltaResult> {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: auth.headers,
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      kind?: string;
      currentId?: string;
      previousId?: string;
    };
    if (!res.ok) {
      const err =
        typeof body.error === 'string' && body.error.trim()
          ? body.error.trim()
          : res.statusText || 'delta_failed';
      return { ok: false, error: err, status: res.status };
    }
    if (!body.currentId || !body.previousId) {
      return { ok: false, error: 'delta_invalid' };
    }
    return { ok: true, delta: body as CheckionScanDeltaResult };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'delta_network',
    };
  }
}

export async function fetchCheckionScanDelta(
  scanId: string,
  previousId?: string | null
): Promise<FetchCheckionDeltaResult> {
  const id = scanId.trim();
  if (!id) return { ok: false, error: 'scan_id_required' };
  return fetchDeltaJson(checkionApiScanDelta(id, previousId));
}

export async function fetchCheckionDomainScanDelta(
  domainScanId: string,
  previousId?: string | null
): Promise<FetchCheckionDeltaResult> {
  const id = domainScanId.trim();
  if (!id) return { ok: false, error: 'domain_scan_id_required' };
  return fetchDeltaJson(checkionApiDomainScanDelta(id, previousId));
}

export async function fetchCheckionGeoJobDelta(
  jobId: string,
  previousId?: string | null
): Promise<FetchCheckionDeltaResult> {
  const id = jobId.trim();
  if (!id) return { ok: false, error: 'geo_job_id_required' };
  return fetchDeltaJson(checkionApiGeoJobDelta(id, previousId));
}
