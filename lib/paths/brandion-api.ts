import { getBrandionServiceApiUrl, getBrandionUrl } from '@/lib/constants';

function brandionWebBase(): string {
  return (getBrandionUrl() ?? '').replace(/\/+$/, '');
}

function brandionApiBase(): string {
  return (getBrandionServiceApiUrl() ?? getBrandionUrl() ?? '').replace(/\/+$/, '');
}

/** Brandion projects hub (no Collection context). */
export function pathBrandionProjects(): string {
  const base = brandionWebBase();
  return base ? `${base}/projects` : '/projects';
}

/** Brandion project detail. */
export function pathBrandionProject(projectId: string): string {
  const base = brandionWebBase();
  const path = `/projects/${encodeURIComponent(projectId)}`;
  return base ? `${base}${path}` : path;
}

/** Brandion guideline studio. */
export function pathBrandionGuideline(guidelineId: string): string {
  const base = brandionWebBase();
  const path = `/guidelines/${encodeURIComponent(guidelineId)}`;
  return base ? `${base}${path}` : path;
}

/** Brandion Measured evaluate studio segment. */
export function pathBrandionGuidelineEvaluate(
  guidelineId: string,
  opts?: { adapter?: string }
): string {
  const base = brandionWebBase();
  const q = new URLSearchParams();
  if (opts?.adapter?.trim()) q.set('adapter', opts.adapter.trim());
  const qs = q.toString();
  const path = `/guidelines/${encodeURIComponent(guidelineId)}/evaluate${qs ? `?${qs}` : ''}`;
  return base ? `${base}${path}` : path;
}

/** Machine API — list/create analysis runs for a guideline (Wave 24). */
export function apiBrandionGuidelineAnalysisRuns(guidelineId: string): string {
  const base = brandionApiBase();
  const path = `/api/guidelines/${encodeURIComponent(guidelineId)}/analysis-runs`;
  return base ? `${base}${path}` : path;
}

/** Machine API — analysis run detail. */
export function apiBrandionGuidelineAnalysisRunDetail(
  guidelineId: string,
  runId: string
): string {
  const base = brandionApiBase();
  const path = `/api/guidelines/${encodeURIComponent(guidelineId)}/analysis-runs/${encodeURIComponent(runId)}`;
  return base ? `${base}${path}` : path;
}
