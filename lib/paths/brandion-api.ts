import { getBrandionUrl } from '@/lib/constants';

function brandionWebBase(): string {
  return (getBrandionUrl() ?? '').replace(/\/+$/, '');
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
