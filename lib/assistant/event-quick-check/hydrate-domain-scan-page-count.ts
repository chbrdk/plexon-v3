import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import { fetchCheckionDomainScanV3Preview } from '@/lib/integrations/checkion-domain-scans-v3-client';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';

/**
 * Collection-flow used to persist `domain.pageCount: null`, so magazine shows 0 pages
 * even when CHECKION crawled. Refetch from CHECKION when we have a scan id.
 */
export async function hydrateDomainScanPageCount(
  scan: DomainScanPreview | undefined | null
): Promise<DomainScanPreview | undefined> {
  if (!scan) return undefined;
  if (scan.totalPages > 0) return scan;
  const id = scan.id?.trim();
  if (!id || id === 'unknown') return scan;

  const preview = await fetchCheckionDomainScanV3Preview(id);
  if (!preview.ok) return scan;

  return {
    ...scan,
    totalPages: preview.preview.totalPages,
    score: scan.score || preview.preview.score,
    stats: preview.preview.stats.total > 0 ? preview.preview.stats : scan.stats,
    topIssues: preview.preview.topIssues.length ? preview.preview.topIssues : scan.topIssues,
    status: preview.preview.status || scan.status,
    url: scan.url || preview.preview.url,
    domain: scan.domain || preview.preview.domain,
  };
}

export async function hydrateEventQuickCheckReportDomainPages(
  report: EventQuickCheckReportModel | null
): Promise<EventQuickCheckReportModel | null> {
  if (!report?.domain) return report;
  if (report.domain.totalPages > 0) return report;
  const scanId = report.domain.scanId?.trim() || report.appendix?.scanId?.trim();
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
  if (!hydrated || hydrated.totalPages <= 0) return report;

  return {
    ...report,
    domain: {
      ...report.domain,
      totalPages: hydrated.totalPages,
      score: report.domain.score || hydrated.score,
      stats: hydrated.stats.total > 0 ? hydrated.stats : report.domain.stats,
      topIssues: hydrated.topIssues.length ? hydrated.topIssues : report.domain.topIssues,
    },
    executive: {
      ...report.executive,
      kpiTiles: report.executive.kpiTiles.map((kpi) =>
        kpi.label === 'Seiten gescannt' ? { ...kpi, value: hydrated.totalPages } : kpi
      ),
    },
  };
}
