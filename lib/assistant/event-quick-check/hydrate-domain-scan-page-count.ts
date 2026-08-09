import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  fetchCheckionDomainScanV3Preview,
  findCheckionDomainScanIdByUrl,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
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

function applyHydratedDomainToReport(
  report: EventQuickCheckReportModel,
  scanId: string,
  hydrated: DomainScanPreview
): EventQuickCheckReportModel {
  return {
    ...report,
    domain: {
      ...report.domain!,
      scanId,
      totalPages: hydrated.totalPages || report.domain!.totalPages,
      score: report.domain!.score || hydrated.score,
      stats:
        hydrated.stats.total > 0 || hydrated.stats.errors > 0
          ? hydrated.stats
          : report.domain!.stats,
      topIssues: hydrated.topIssues.length ? hydrated.topIssues : report.domain!.topIssues,
      url: report.domain!.url || hydrated.url,
      domain: report.domain!.domain || hydrated.domain,
    },
    appendix: {
      ...report.appendix,
      scanId: report.appendix.scanId || scanId,
    },
    executive: {
      ...report.executive,
      kpiTiles: syncKpiTilesFromDomain(report.executive.kpiTiles, {
        totalPages: hydrated.totalPages || report.domain!.totalPages,
        errors: hydrated.stats.errors || report.domain!.stats.errors,
        score: report.domain!.score || hydrated.score,
      }),
    },
  };
}

/** Keep KPI strip aligned with domain magazine fields. */
export function syncKpiTilesFromDomain(
  kpiTiles: EventQuickCheckReportModel['executive']['kpiTiles'],
  domain: { totalPages: number; errors: number; score: number }
): EventQuickCheckReportModel['executive']['kpiTiles'] {
  return kpiTiles.map((kpi) => {
    const label = kpi.label.toLowerCase();
    if (label.includes('seiten') && domain.totalPages > 0) {
      return { ...kpi, value: domain.totalPages };
    }
    if ((label.includes('a11y') || label.includes('fehler')) && domain.errors > 0) {
      return { ...kpi, value: domain.errors, tone: 'error' };
    }
    if (label.includes('domain') && label.includes('score') && domain.score > 0) {
      if (kpi.value === 0 || kpi.value === '—' || kpi.value === '0') {
        return { ...kpi, value: domain.score, unit: kpi.unit ?? '/100' };
      }
    }
    return kpi;
  });
}

export async function hydrateEventQuickCheckReportDomainPages(
  report: EventQuickCheckReportModel | null,
  fallbackScanId?: string | null
): Promise<EventQuickCheckReportModel | null> {
  if (!report?.domain) return report;
  if (!needsCheckionHydration(report.domain)) {
    // Still sync KPI strip if domain already has data but tiles stayed at 0.
    if (report.domain.totalPages > 0 || report.domain.stats.errors > 0) {
      return {
        ...report,
        executive: {
          ...report.executive,
          kpiTiles: syncKpiTilesFromDomain(report.executive.kpiTiles, {
            totalPages: report.domain.totalPages,
            errors: report.domain.stats.errors,
            score: report.domain.score,
          }),
        },
      };
    }
    return report;
  }

  let scanId = [report.domain.scanId, report.appendix?.scanId, fallbackScanId]
    .map((c) => c?.trim())
    .find(isRealScanId);

  if (!scanId) {
    scanId = await findCheckionDomainScanIdByUrl({
      url: report.domain.url || report.meta.url,
      domain: report.domain.domain || report.meta.domain,
      score: report.domain.score,
    });
  }
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

  return applyHydratedDomainToReport(report, scanId, hydrated);
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
    const ds = (checkpoint as { domainScan?: { id?: string } }).domainScan;
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

  const flow = stored.eqcFlowState;
  if (flow && typeof flow === 'object') {
    const outputs = (flow as { context?: { outputs?: Record<string, Record<string, unknown>> } }).context
      ?.outputs;
    const domain = outputs?.domain;
    if (domain && isRealScanId(typeof domain.scanId === 'string' ? domain.scanId : null)) {
      return String(domain.scanId).trim();
    }
  }

  return null;
}
