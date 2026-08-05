import { getCheckionServiceApiUrl, getCheckionUrl } from '@/lib/constants';
import {
  ASSISTANT_REPORT_PPTX_DEBUG_PARAM,
  ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN,
} from '@/lib/paths/assistant-report-export';

export function checkionApiProjectsCreate(): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/projects`;
}

export function pathCheckionProject(projectId: string): string {
  const base = getCheckionUrl().replace(/\/+$/, '');
  return `${base}/projects/${encodeURIComponent(projectId)}`;
}

export function pathCheckionScanResult(scanId: string): string {
  const base = getCheckionUrl().replace(/\/+$/, '');
  return `${base}/results/${encodeURIComponent(scanId)}`;
}

/** Domain scan magazine detail — `CHECKION/app/domain/[id]/…`. */
export function pathCheckionDomainResult(domainScanId: string): string {
  const base = getCheckionUrl().replace(/\/+$/, '');
  return `${base}/domain/${encodeURIComponent(domainScanId)}`;
}

export function pathCheckionDomainScan(input: {
  url: string;
  scanId?: string;
  projectId?: string;
}): string {
  const base = getCheckionUrl().replace(/\/+$/, '');
  const params = new URLSearchParams({ url: input.url });
  if (input.scanId) params.set('scanId', input.scanId);
  if (input.projectId) params.set('projectId', input.projectId);
  return `${base}/scan/domain?${params}`;
}

export function checkionApiScan(): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/scan`;
}

/** POST/GET /api/scans — contracts ScanSummary (mode single|deep). Not legacy `/api/scan`. */
export function checkionApiScans(): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/scans`;
}

/** GET /api/scans/:id */
export function checkionApiScanDetail(scanId: string): string {
  return `${checkionApiScans()}/${encodeURIComponent(scanId)}`;
}

export function checkionApiScanProject(scanId: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/scan/${encodeURIComponent(scanId)}/project`;
}

export function checkionApiScansDomainProject(domainScanId: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/scans/domain/${encodeURIComponent(domainScanId)}/project`;
}

export function checkionApiGeoEeatProject(jobId: string): string {
  return `${checkionApiGeoEeatJob(jobId)}/project`;
}

export function checkionApiScanSummarize(scanId: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/scan/${encodeURIComponent(scanId)}/summarize`;
}

export function checkionApiToolsPageSpeed(url: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  const params = new URLSearchParams({ url });
  return `${base}/api/tools/pagespeed?${params}`;
}

export function checkionApiProjectPath(projectId: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/projects/${encodeURIComponent(projectId)}`;
}

/** POST /api/projects/[id]/suggest-competitors — same as CHECKION project UI. */
export function checkionApiProjectSuggestCompetitors(projectId: string): string {
  return `${checkionApiProjectPath(projectId)}/suggest-competitors`;
}

/** POST /api/projects/[id]/domain-scan-all — own domain + all project.competitors. */
export function checkionApiProjectDomainScanAll(
  projectId: string,
  query?: {
    maxPages?: number;
    classifyPageTopics?: boolean;
    skipUnchangedPages?: boolean;
    aiFillProjectMetadata?: boolean;
  }
): string {
  const base = `${checkionApiProjectPath(projectId)}/domain-scan-all`;
  if (!query) return base;
  const sp = new URLSearchParams();
  if (query.maxPages != null) sp.set('maxPages', String(query.maxPages));
  if (query.classifyPageTopics) sp.set('classifyPageTopics', 'true');
  if (query.skipUnchangedPages) sp.set('skipUnchangedPages', 'true');
  if (query.aiFillProjectMetadata === false) sp.set('aiFillProjectMetadata', 'false');
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/** GET /api/projects/[id]/domain-summary-all — own + competitor scan summaries. */
export function checkionApiProjectDomainSummaryAll(projectId: string): string {
  return `${checkionApiProjectPath(projectId)}/domain-summary-all`;
}

export function checkionApiProjectResearch(projectId: string): string {
  const base = getCheckionServiceApiUrl().replace(/\/+$/, '');
  return `${base}/api/projects/${encodeURIComponent(projectId)}/research`;
}

function checkionServiceBase(): string {
  return getCheckionServiceApiUrl().replace(/\/+$/, '');
}

export function checkionApiScanDomainCreate(): string {
  return `${checkionServiceBase()}/api/scan/domain`;
}

export function checkionApiScanDomainStatus(scanId: string): string {
  return `${checkionServiceBase()}/api/scan/domain/${encodeURIComponent(scanId)}/status`;
}

export function checkionApiScanDomainSummary(scanId: string, light = true): string {
  const base = `${checkionServiceBase()}/api/scan/domain/${encodeURIComponent(scanId)}/summary`;
  return light ? `${base}?light=1` : base;
}

export function checkionApiGeoEeatStart(): string {
  return `${checkionServiceBase()}/api/scan/geo-eeat`;
}

export function checkionApiGeoEeatJob(jobId: string): string {
  return `${checkionServiceBase()}/api/scan/geo-eeat/${encodeURIComponent(jobId)}`;
}

export function checkionApiGeoEeatStatus(jobId: string): string {
  return `${checkionServiceBase()}/api/scan/geo-eeat/${encodeURIComponent(jobId)}/status`;
}

export function checkionApiGeoEeatRerunCompetitive(jobId: string): string {
  return `${checkionServiceBase()}/api/scan/geo-eeat/${encodeURIComponent(jobId)}/rerun-competitive`;
}

export function checkionApiGeoEeatSuggestQueries(): string {
  return `${checkionServiceBase()}/api/scan/geo-eeat/suggest-competitors-queries`;
}

export function checkionApiToolsSsl(host: string): string {
  const params = new URLSearchParams({ host });
  return `${checkionServiceBase()}/api/tools/ssl-labs?${params}`;
}

export function checkionApiToolsWayback(url: string): string {
  const params = new URLSearchParams({ url });
  return `${checkionServiceBase()}/api/tools/wayback?${params}`;
}

export function checkionApiToolsContrast(foreground: string, background: string): string {
  const params = new URLSearchParams({ f: foreground.replace(/^#/, ''), b: background.replace(/^#/, '') });
  return `${checkionServiceBase()}/api/tools/contrast?${params}`;
}

export function checkionApiToolsReadability(): string {
  return `${checkionServiceBase()}/api/tools/readability`;
}

export function checkionApiToolsExtract(url: string, selector = 'body'): string {
  const params = new URLSearchParams({ url, selector, type: 'text' });
  return `${checkionServiceBase()}/api/tools/extract?${params}`;
}

/** CHECKION PDF render for PLEXON assistant curated reports (PLEXON_SERVICE_SECRET). */
export function checkionApiPlexonAssistantReportPdf(): string {
  return `${checkionServiceBase()}/api/integrations/plexon/assistant-report/pdf`;
}

/** CHECKION PPTX render for PLEXON assistant curated reports (PLEXON_SERVICE_SECRET). */
export function checkionApiPlexonAssistantReportPptx(options?: { debugPlan?: boolean }): string {
  const base = `${checkionServiceBase()}/api/integrations/plexon/assistant-report/pptx`;
  if (options?.debugPlan) {
    return `${base}?${ASSISTANT_REPORT_PPTX_DEBUG_PARAM}=${ASSISTANT_REPORT_PPTX_DEBUG_QUERY_PLAN}`;
  }
  return base;
}
