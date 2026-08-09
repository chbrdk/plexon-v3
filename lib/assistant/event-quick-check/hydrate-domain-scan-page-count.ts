import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import { fetchCheckionDomainScanV3Preview } from '@/lib/integrations/checkion-domain-scans-v3-client';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';

function isRealScanId(id: string | null | undefined): id is string {
  const t = id?.trim();
  return Boolean(t && t !== 'unknown');
}

function needsCheckionHydration(scan: {
  totalPages: number;
  stats?: { total?: number; errors?: number };
  topIssues?: unknown[];
}): boolean {
  if (scan.totalPages <= 0) return true;
  const statsTotal = Number(scan.stats?.total ?? 0);
  const errors = Number(scan.stats?.errors ?? 0);
  if (statsTotal <= 0 && errors <= 0) return true;
  if (!scan.topIssues?.length && errors <= 0) return true;
  return false;
}

/**
 * Refetch domain magazine fields from CHECKION when Collection Flow left them empty
 * (`pageCount: null`, empty stats/topIssues).
 */
export async function hydrateDomainScanPageCount(
  scan: DomainScanPreview | undefined | null
): Promise<DomainScanPreview | undefined> {
  if (!scan) return undefined;
  if (!needsCheckionHydration(scan)) return scan;
  if (!isRealScanId(scan.id)) return scan;

  const preview = await fetchCheckionDomainScanV3Preview(scan.id);
  if (!preview.ok) return scan;

  return {
    ...scan,
    totalPages: preview.preview.totalPages || scan.totalPages,
    score: scan.score || preview.preview.score,
    stats:
      preview.preview.stats.total > 0 || preview.preview.stats.errors > 0
        ? preview.preview.stats
        : scan.stats,
    topIssues: preview.preview.topIssues.length ? preview.preview.topIssues : scan.topIssues,
    status: preview.preview.status || scan.status,
    url: scan.url || preview.preview.url,
    domain: scan.domain || preview.preview.domain,
  };
}

export async function hydrateEventQuickCheckReportDomainPages(
  report: EventQuickCheckReportModel | null,
  fallbackScanId?: string | null
): Promise<EventQuickCheckReportModel | null> {
  if (!report?.domain) return report;
  if (!needsCheckionHydration(report.domain)) return report;

  const candidates = [
    report.domain.scanId,
    report.appendix?.scanId,
    fallbackScanId,
  ];
  const scanId = candidates.map((c) => c?.trim()).find(isRealScanId);
  if (!scanId) return report;

  const hydrated = await hydrateDomainScanPageCount({
    id: scanId,
    domain: report.domain.domain || '',
    url: report.domain.url || '',
    status: report.domain.status || 'completed',
    score: report.domain.score,
    totalPages: report.domain.totalPages,
    stats: report.domain.stats,
    topIssues: report.domain.topIssues,
  });
  if (!hydrated) return report;
  if (hydrated.totalPages <= 0 && hydrated.stats.total <= 0 && hydrated.stats.errors <= 0) {
    return report;
  }

  return {
    ...report,
    domain: {
      ...report.domain,
      scanId,
      totalPages: hydrated.totalPages || report.domain.totalPages,
      score: report.domain.score || hydrated.score,
      stats:
        hydrated.stats.total > 0 || hydrated.stats.errors > 0
          ? hydrated.stats
          : report.domain.stats,
      topIssues: hydrated.topIssues.length ? hydrated.topIssues : report.domain.topIssues,
      url: report.domain.url || hydrated.url,
      domain: report.domain.domain || hydrated.domain,
    },
    appendix: {
      ...report.appendix,
      scanId: report.appendix.scanId || scanId,
    },
    executive: {
      ...report.executive,
      kpiTiles: report.executive.kpiTiles.map((kpi) => {
        if (kpi.label === 'Seiten gescannt' && hydrated.totalPages > 0) {
          return { ...kpi, value: hydrated.totalPages };
        }
        if (kpi.label === 'A11y-Fehler' && (hydrated.stats.errors > 0 || hydrated.stats.total > 0)) {
          return {
            ...kpi,
            value: hydrated.stats.errors,
            tone: hydrated.stats.errors > 0 ? 'error' : 'success',
          };
        }
        if (kpi.label === 'Domain-Score' && hydrated.score > 0 && (kpi.value === 0 || kpi.value === '—')) {
          return { ...kpi, value: hydrated.score, unit: '/100', tone: 'neutral' };
        }
        return kpi;
      }),
    },
  };
}

/** Pull scan id from common EQC result blobs when report.domain.scanId is missing/unknown. */
export function resolveEqcDomainScanIdFromStored(stored: Record<string, unknown> | null | undefined): string | null {
  if (!stored || typeof stored !== 'object') return null;

  const report = stored.report;
  if (report && typeof report === 'object') {
    const domain = (report as { domain?: { scanId?: string }; appendix?: { scanId?: string } }).domain;
    const appendix = (report as { appendix?: { scanId?: string } }).appendix;
    if (isRealScanId(domain?.scanId)) return domain!.scanId!.trim();
    if (isRealScanId(appendix?.scanId)) return appendix!.scanId!.trim();
  }

  const checkpoint = stored.checkpoint;
  if (checkpoint && typeof checkpoint === 'object') {
    const ds = (checkpoint as { domainScan?: { id?: string }; outcomes?: Array<{ stepId?: string; data?: { scanId?: string } }> })
      .domainScan;
    if (isRealScanId(ds?.id)) return ds!.id!.trim();
    const outcomes = (checkpoint as { outcomes?: Array<{ stepId?: string; data?: { scanId?: string } }> }).outcomes;
    if (Array.isArray(outcomes)) {
      for (const o of outcomes) {
        if (o?.stepId === 'domain_scan' && isRealScanId(o.data?.scanId)) {
          return o.data!.scanId!.trim();
        }
      }
    }
  }

  return null;
}
