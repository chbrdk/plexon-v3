import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import { fetchCheckionGeoJobV3Preview } from '@/lib/integrations/checkion-geo-jobs-v3-client';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { parseGeoMeasurement, type GeoMeasurement } from '@/lib/geo/measurement';

function isRealGeoJobId(id: string | null | undefined): id is string {
  const t = id?.trim();
  return Boolean(t && t !== 'unknown');
}

function needsGeoHydration(geo: EventQuickCheckReportModel['geo'] | GeoEeatJobPreview | undefined): boolean {
  if (!geo) return false;
  const byModel = 'citationHighlightsByModel' in geo ? geo.citationHighlightsByModel : undefined;
  // Per-model query runs already present (answers included when CHECKION had them).
  if (byModel?.some((s) => (s.runs?.length ?? 0) > 0)) return false;
  return true;
}

/** Persistable catalog fragment for Collection Flow `outputs.geo.preview`. */
export function geoPreviewForCatalogBundle(
  preview: GeoEeatJobPreview
): Record<string, unknown> {
  return {
    jobId: preview.jobId,
    url: preview.url,
    status: preview.status,
    overallScore: preview.overallScore ?? null,
    citedShare: preview.citedShare ?? null,
    geoFitnessScore: preview.geoFitnessScore ?? null,
    eeatScores: preview.eeatScores,
    geoFitnessReasoning: preview.geoFitnessReasoning,
    missingGeoElements: preview.missingGeoElements,
    competitors: preview.competitors,
    keywords: preview.keywords,
    queries: preview.queries,
    recommendations: preview.recommendations,
    citationHighlights: preview.citationHighlights,
    citationHighlightsByModel: preview.citationHighlightsByModel,
    competitiveOnly: preview.competitiveOnly,
  };
}

/** Merge CHECKION GEO preview into a thin job stub from Collection Flow. */
export function mergeGeoPreviewIntoJob(
  base: GeoEeatJobPreview | undefined,
  preview: GeoEeatJobPreview
): GeoEeatJobPreview {
  return {
    jobId: preview.jobId || base?.jobId || 'unknown',
    url: preview.url || base?.url || '',
    status: preview.status || base?.status || 'completed',
    overallScore: preview.overallScore ?? base?.overallScore ?? null,
    citedShare: preview.citedShare ?? base?.citedShare ?? null,
    geoFitnessScore: preview.geoFitnessScore ?? base?.geoFitnessScore ?? null,
    eeatScores: preview.eeatScores ?? base?.eeatScores,
    geoFitnessReasoning: preview.geoFitnessReasoning ?? base?.geoFitnessReasoning,
    missingGeoElements: preview.missingGeoElements?.length
      ? preview.missingGeoElements
      : base?.missingGeoElements,
    competitors: preview.competitors?.length ? preview.competitors : base?.competitors,
    keywords: preview.keywords?.length ? preview.keywords : base?.keywords,
    queries: preview.queries?.length ? preview.queries : base?.queries,
    recommendations: preview.recommendations?.length
      ? preview.recommendations
      : base?.recommendations,
    citationHighlights: preview.citationHighlights?.length
      ? preview.citationHighlights
      : base?.citationHighlights,
    citationHighlightsByModel: preview.citationHighlightsByModel?.length
      ? preview.citationHighlightsByModel
      : base?.citationHighlightsByModel,
    competitiveOnly: preview.competitiveOnly ?? base?.competitiveOnly,
  };
}

/**
 * Restore GeoEeatJobPreview from Collection Flow geo catalog (scores + optional preview).
 */
export function geoJobFromCatalogBundle(
  bundle: Record<string, unknown> | null | undefined,
  fallbackJobId?: string | null
): GeoEeatJobPreview | undefined {
  if (!bundle && !fallbackJobId) return undefined;
  const previewRaw =
    bundle?.preview && typeof bundle.preview === 'object'
      ? (bundle.preview as Record<string, unknown>)
      : null;
  const fromPreview = previewRaw
    ? ({
        jobId:
          typeof previewRaw.jobId === 'string'
            ? previewRaw.jobId
            : fallbackJobId || 'unknown',
        url: typeof previewRaw.url === 'string' ? previewRaw.url : '',
        status: typeof previewRaw.status === 'string' ? previewRaw.status : 'completed',
        overallScore:
          typeof previewRaw.overallScore === 'number' ? previewRaw.overallScore : null,
        citedShare:
          typeof previewRaw.citedShare === 'number'
            ? previewRaw.citedShare
            : null,
        geoFitnessScore:
          typeof previewRaw.geoFitnessScore === 'number'
            ? previewRaw.geoFitnessScore
            : typeof previewRaw.geoFitness === 'number'
              ? previewRaw.geoFitness
              : null,
        eeatScores: previewRaw.eeatScores as GeoEeatJobPreview['eeatScores'],
        geoFitnessReasoning:
          typeof previewRaw.geoFitnessReasoning === 'string'
            ? previewRaw.geoFitnessReasoning
            : undefined,
        missingGeoElements: Array.isArray(previewRaw.missingGeoElements)
          ? (previewRaw.missingGeoElements as string[])
          : undefined,
        competitors: previewRaw.competitors as GeoEeatJobPreview['competitors'],
        keywords: previewRaw.keywords as string[] | undefined,
        queries: previewRaw.queries as string[] | undefined,
        recommendations: previewRaw.recommendations as GeoEeatJobPreview['recommendations'],
        citationHighlights:
          previewRaw.citationHighlights as GeoEeatJobPreview['citationHighlights'],
        citationHighlightsByModel:
          previewRaw.citationHighlightsByModel as GeoEeatJobPreview['citationHighlightsByModel'],
        competitiveOnly: previewRaw.competitiveOnly as boolean | undefined,
      } satisfies GeoEeatJobPreview)
    : undefined;

  const thin: GeoEeatJobPreview = {
    jobId: fallbackJobId || (typeof bundle?.jobId === 'string' ? bundle.jobId : 'unknown'),
    url: typeof bundle?.url === 'string' ? bundle.url : fromPreview?.url || '',
    status: typeof bundle?.status === 'string' ? bundle.status : fromPreview?.status || 'completed',
    overallScore:
      typeof bundle?.overallScore === 'number'
        ? bundle.overallScore
        : fromPreview?.overallScore ?? null,
    citedShare:
      typeof bundle?.citedShare === 'number'
        ? bundle.citedShare
        : fromPreview?.citedShare ?? null,
    geoFitnessScore:
      typeof bundle?.geoFitness === 'number'
        ? bundle.geoFitness
        : fromPreview?.geoFitnessScore ?? null,
  };

  return fromPreview ? mergeGeoPreviewIntoJob(thin, fromPreview) : thin;
}

export function geoJobsFromCatalogBundle(
  bundle: Record<string, unknown> | null | undefined,
  fallbackJobId?: string | null
): Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }> {
  const layers = Array.isArray(bundle?.layers) ? bundle.layers : [];
  const fromLayers = layers
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const job = geoJobFromCatalogBundle(o, typeof o.jobId === 'string' ? o.jobId : fallbackJobId);
      if (!job) return null;
      return { measurement: parseGeoMeasurement(o.measurement), job };
    })
    .filter((x): x is { measurement: GeoMeasurement; job: GeoEeatJobPreview } => Boolean(x));
  if (fromLayers.length) return fromLayers;
  const one = geoJobFromCatalogBundle(bundle, fallbackJobId);
  if (!one) return [];
  return [{ measurement: parseGeoMeasurement(bundle?.measurement), job: one }];
}

/** Refetch full GEO magazine fields from CHECKION when flow left only scores. */
export async function hydrateGeoJobPreview(
  job: GeoEeatJobPreview | undefined | null
): Promise<GeoEeatJobPreview | undefined> {
  if (!job) return undefined;
  if (!needsGeoHydration(job)) return job;
  if (!isRealGeoJobId(job.jobId)) return job;
  const preview = await fetchCheckionGeoJobV3Preview(job.jobId);
  if (!preview.ok) return job;
  return mergeGeoPreviewIntoJob(job, preview.job);
}

export async function hydrateEventQuickCheckReportGeo(
  report: EventQuickCheckReportModel | null
): Promise<EventQuickCheckReportModel | null> {
  if (!report?.geo) return report;
  if (!needsGeoHydration(report.geo)) return report;
  const jobId = report.geo.jobId || report.appendix?.geoJobId;
  if (!isRealGeoJobId(jobId)) return report;

  const preview = await fetchCheckionGeoJobV3Preview(jobId);
  if (!preview.ok) return report;
  const merged = mergeGeoPreviewIntoJob(
    {
      jobId,
      url: report.geo.url || report.meta.url,
      status: report.geo.status === 'complete' ? 'completed' : report.geo.status,
      overallScore: report.geo.overallScore,
      geoFitnessScore: report.geo.geoFitnessScore,
      competitors: report.geo.competitors,
      recommendations: report.geo.recommendations,
      citationHighlights: report.geo.citationHighlights,
      citationHighlightsByModel: report.geo.citationHighlightsByModel,
      queries: report.geo.questions,
    },
    preview.job
  );

  return {
    ...report,
    geo: {
      ...report.geo,
      status: report.geo.status === 'failed' ? 'failed' : 'complete',
      overallScore: merged.overallScore ?? report.geo.overallScore,
      geoFitnessScore: merged.geoFitnessScore ?? report.geo.geoFitnessScore,
      jobId: merged.jobId || report.geo.jobId,
      url: merged.url || report.geo.url,
      competitors: merged.competitors?.length ? merged.competitors : report.geo.competitors,
      recommendations: merged.recommendations?.length
        ? merged.recommendations
        : report.geo.recommendations,
      citationHighlights: merged.citationHighlights?.length
        ? merged.citationHighlights
        : report.geo.citationHighlights,
      citationHighlightsByModel:
        merged.citationHighlightsByModel?.length
          ? merged.citationHighlightsByModel
          : report.geo.citationHighlightsByModel,
      questions: merged.queries?.length ? merged.queries : report.geo.questions,
      eeatMissingElements: merged.missingGeoElements?.length
        ? merged.missingGeoElements
        : report.geo.eeatMissingElements,
      geoFitnessReasoning:
        merged.geoFitnessReasoning || report.geo.geoFitnessReasoning,
      eeatDimensions: (() => {
        const fromPreview = merged.eeatScores
          ? (
              [
                ['trust', 'Trust'],
                ['experience', 'Experience'],
                ['expertise', 'Expertise'],
                ['authoritativeness', 'Authoritativeness'],
              ] as const
            )
              .map(([key, label]) => {
                const dim = merged.eeatScores?.[key];
                if (!dim) return null;
                return { key, label, score: dim.score, reasoning: dim.reasoning };
              })
              .filter((d): d is NonNullable<typeof d> => Boolean(d))
          : [];
        if (!report.geo.eeatDimensions.length) return fromPreview;
        if (!fromPreview.length) return report.geo.eeatDimensions;
        return report.geo.eeatDimensions.map((d) => {
          const richer = fromPreview.find((p) => p.key === d.key);
          if (!richer) return d;
          return {
            ...d,
            score: richer.score ?? d.score,
            reasoning: richer.reasoning || d.reasoning,
          };
        });
      })(),
    },
  };
}
