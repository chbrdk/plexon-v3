/**
 * Shared `checkion.geo_job` capability (Wave C4).
 * @see specs/domain/capability-catalog.md
 */

import { buildGeoCatalogBundle } from '@/lib/collection-flow-run-context';
import { geoPreviewForCatalogBundle } from '@/lib/assistant/event-quick-check/hydrate-geo-job-preview';
import type { GeoGateSignals } from '@/lib/collection-test-flow';
import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import {
  runCheckionGeoJobV3,
  type CheckionGeoJobSummary,
} from '@/lib/integrations/checkion-geo-jobs-v3-client';
import { parseGeoMeasurement } from '@/lib/geo/measurement';

export type CheckionGeoJobPayload = {
  variant: 'flow' | 'agent';
  job: CheckionGeoJobSummary;
  preview?: GeoEeatJobPreview;
  /** Agent UI preview when source is agent and preview was loaded. */
  agentPreview?: GeoEeatJobPreview;
};

export type CheckionGeoJobCapabilityResult = CapabilityResult & {
  agentPayload?: CheckionGeoJobPayload;
  signals?: GeoGateSignals;
};

export const executeCheckionGeoJob: CapabilityExecutor = async (input, ctx) =>
  executeCheckionGeoJobCapability(input, ctx);

export async function executeCheckionGeoJobCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CheckionGeoJobCapabilityResult> {
  const projectId = (ctx.checkionProjectId ?? '').trim();
  if (!projectId) {
    return { ok: false, error: 'Checkion projectId fehlt', catalogRoot: 'geo' };
  }

  const url = typeof input.url === 'string' ? input.url.trim() : '';
  const companyName =
    typeof input.companyName === 'string' ? input.companyName.trim() : '';
  const queries = Array.isArray(input.queries)
    ? input.queries.map((q) => String(q).trim()).filter(Boolean)
    : typeof input.text === 'string'
      ? input.text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
  const competitors = Array.isArray(input.competitors)
    ? input.competitors.map((c) => String(c).trim()).filter(Boolean)
    : undefined;

  if (!url && !companyName) {
    return { ok: false, error: 'URL oder companyName fehlt', catalogRoot: 'geo' };
  }

  const includePageScan =
    input.includePageScan === true || input.deep === true || input.runCompetitive === true;

  const result = await runCheckionGeoJobV3({
    projectId,
    platformProjectId: ctx.platformProjectId?.trim() || undefined,
    url: url || undefined,
    companyName: companyName || undefined,
    queries: queries.length ? queries : undefined,
    includePageScan,
    measurement: parseGeoMeasurement(input.measurement),
    ...(competitors?.length ? { competitors } : {}),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      catalogRoot: 'geo',
      agentPayload: result.job
        ? { variant: ctx.source, job: result.job }
        : undefined,
    };
  }

  const job = result.job;
  const signals = result.signals;
  const catalogBundle = buildGeoCatalogBundle({
    status: job.status,
    citedShare: job.citedShare ?? null,
    geoFitness: job.geoFitness ?? null,
    overallScore: job.overallScore ?? null,
    url: job.url || url || '',
    measurement: parseGeoMeasurement(input.measurement),
    preview: result.preview ? geoPreviewForCatalogBundle(result.preview) : null,
  });

  return {
    ok: true,
    catalogRoot: 'geo',
    catalogBundle,
    signals,
    agentPayload: {
      variant: ctx.source,
      job,
      preview: result.preview,
      agentPreview: result.preview,
    },
  };
}
