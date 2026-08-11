/**
 * Normalize Assistant quick-scan preview into Collection Flow scan.* catalog bundle.
 * Shared shape for Agent and Flow entrypoints (Wave C1 contract).
 * @see specs/domain/capability-catalog.md
 */

import { buildScanCatalogBundle } from '@/lib/collection-flow-run-context';

/** Minimal Agent scan shape (matches ScanResultPreview fields used for catalog). */
export type AgentScanPreviewForCatalog = {
  id?: string;
  url: string;
  score: number;
  stats?: {
    errors?: number;
    warnings?: number;
    notices?: number;
    total?: number;
  };
  issues?: Array<{
    id?: string;
    severity?: string;
    ruleId?: string | null;
    title?: string | null;
  }>;
};

/**
 * Map Agent scan preview → same bundle Flow writes under context.scan.
 * Accessibility overall uses `score`; issue severities map errors→critical, warnings→serious.
 */
export function normalizeScanCatalogFromAgentPreview(
  scan: AgentScanPreviewForCatalog
): Record<string, unknown> {
  const criticalCount = scan.stats?.errors ?? 0;
  const seriousCount = scan.stats?.warnings ?? 0;
  const issueCount = scan.stats?.total ?? scan.issues?.length ?? criticalCount + seriousCount;
  const issueItems = (scan.issues ?? []).map((it) => ({
    id: it.id ?? null,
    severity: it.severity ?? null,
    ruleId: it.ruleId ?? null,
    title: it.title ?? null,
  }));

  return buildScanCatalogBundle({
    status: 'completed',
    overallScore: scan.score,
    url: scan.url,
    issueCount,
    scoresByKind: { accessibility: scan.score },
    issues: {
      criticalCount,
      seriousCount,
      issueCount,
    },
    issueItems,
  });
}

/** Flow-side helper: identical builder entry for explicit fields. */
export function normalizeScanCatalogFromFlowFields(input: {
  status: string;
  overallScore: number | null;
  url: string;
  issueCount?: number | null;
  scoresByKind?: Record<string, number> | null;
  criticalCount?: number;
  seriousCount?: number;
  issueItems?: Array<{
    id?: string | null;
    severity?: string | null;
    ruleId?: string | null;
    title?: string | null;
  }>;
}): Record<string, unknown> {
  return buildScanCatalogBundle({
    status: input.status,
    overallScore: input.overallScore,
    url: input.url,
    issueCount: input.issueCount,
    scoresByKind: input.scoresByKind,
    issues: {
      criticalCount: input.criticalCount ?? 0,
      seriousCount: input.seriousCount ?? 0,
      issueCount: input.issueCount ?? 0,
    },
    issueItems: input.issueItems,
  });
}
