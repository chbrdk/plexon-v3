import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import { pathCheckionDomainScan, pathCheckionProject } from '@/lib/paths/checkion-api';
import type {
  EventQuickCheckReportDomainComparisonRow,
  EventQuickCheckReportDomainComparisonSection,
} from '@/lib/assistant/reports/event-quick-check-report-types';

function mapScanToRow(
  scan: DomainScanPreview,
  role: 'own' | 'competitor',
  fallbackUrl: string
): EventQuickCheckReportDomainComparisonRow {
  return {
    domain: scan.domain,
    role,
    score: scan.score,
    totalPages: scan.totalPages,
    stats: scan.stats,
    scanId: scan.id,
    checkionHref: pathCheckionDomainScan({
      url: scan.url || fallbackUrl,
      scanId: scan.id,
    }),
  };
}

function readDomainScanStepData(quick: EventQuickCheckResult): {
  competitorScans: Record<string, DomainScanPreview>;
  failed: string[];
} {
  const step = quick.outcomes.find((o) => o.stepId === 'domain_scan' && o.status === 'done');
  const data = step?.data as
    | {
        competitorScans?: Record<string, DomainScanPreview>;
        failed?: string[];
      }
    | undefined;
  return {
    competitorScans: data?.competitorScans ?? {},
    failed: data?.failed ?? [],
  };
}

/** Build multi-domain comparison for complete scan (own + competitor deep scans). */
export function buildEventQuickCheckDomainComparisonSection(
  quick: EventQuickCheckResult
): EventQuickCheckReportDomainComparisonSection | undefined {
  const { competitorScans, failed } = readDomainScanStepData(quick);
  const competitorCount = Object.keys(competitorScans).length;
  if (!competitorCount && !failed.length) return undefined;
  if (!quick.domainScan && !competitorCount) return undefined;

  const rows: EventQuickCheckReportDomainComparisonRow[] = [];
  if (quick.domainScan) {
    rows.push(mapScanToRow(quick.domainScan, 'own', quick.url));
  }
  for (const scan of Object.values(competitorScans)) {
    rows.push(mapScanToRow(scan, 'competitor', quick.url));
  }

  rows.sort((a, b) => {
    if (a.role === 'own') return -1;
    if (b.role === 'own') return 1;
    return b.score - a.score;
  });

  const checkionProjectId = quick.checkionProjectId?.trim();
  return {
    checkionProjectId: checkionProjectId || undefined,
    checkionProjectHref: checkionProjectId ? pathCheckionProject(checkionProjectId) : undefined,
    rows,
    failedDomains: failed.length ? failed : undefined,
  };
}
