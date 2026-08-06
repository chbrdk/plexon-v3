import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client'
import type { CheckionDomainScanSummary } from '@/lib/integrations/checkion-domain-scans-v3-client'

export type DomainScanV3IssueRow = {
  title?: string
  ruleId?: string
  severity?: string
  affectedCount?: number
  count?: number
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//i, '').split('/')[0] ?? url
  }
}

function severityBucket(severity: string | undefined): 'errors' | 'warnings' | 'notices' {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical' || s === 'serious' || s === 'error') return 'errors'
  if (s === 'moderate' || s === 'warning') return 'warnings'
  return 'notices'
}

/** Map CHECKION v3 domain-scan summary + issues list → legacy DomainScanPreview. */
export function mapDomainScanV3ToPreview(input: {
  scan: CheckionDomainScanSummary
  issues?: DomainScanV3IssueRow[]
  issueStats?: { errors?: number; warnings?: number; notices?: number; total?: number } | null
}): DomainScanPreview {
  const { scan, issues = [], issueStats } = input
  const url = scan.url || ''
  const domain = hostFromUrl(url)

  const stats = {
    errors: Number(issueStats?.errors ?? 0),
    warnings: Number(issueStats?.warnings ?? 0),
    notices: Number(issueStats?.notices ?? 0),
    total: Number(issueStats?.total ?? 0),
  }

  if (!issueStats && issues.length > 0) {
    for (const row of issues) {
      const bucket = severityBucket(row.severity)
      const n = Number(row.affectedCount ?? row.count ?? 1)
      stats[bucket] += Number.isFinite(n) ? n : 1
    }
    stats.total = stats.errors + stats.warnings + stats.notices
  }

  const topIssues = issues
    .map((row) => ({
      title: String(row.title ?? row.ruleId ?? 'Issue'),
      count: Number(row.affectedCount ?? row.count ?? 1) || 1,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const status =
    scan.status === 'completed' || scan.status === 'complete'
      ? 'complete'
      : scan.status === 'failed' || scan.status === 'error'
        ? 'error'
        : scan.status

  return {
    id: scan.id,
    domain,
    url: url || (domain ? `https://${domain}` : ''),
    status,
    totalPages: scan.pageCount ?? 0,
    score: scan.overallScore ?? 0,
    stats,
    topIssues,
  }
}
