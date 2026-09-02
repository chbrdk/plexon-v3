/**
 * Shared `checkion.domain_scan` capability (Wave C4).
 * @see specs/domain/capability-catalog.md
 */

import { buildDomainCatalogBundle } from '@/lib/collection-flow-run-context';
import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  fetchCheckionDomainScanV3Preview,
  runCheckionDomainScanV3,
  type CheckionDomainScanSummary,
} from '@/lib/integrations/checkion-domain-scans-v3-client';

export type CheckionDomainScanFlowPayload = {
  variant: 'flow';
  scan: CheckionDomainScanSummary;
};

export type CheckionDomainScanAgentPayload = {
  variant: 'agent';
  scan: DomainScanPreview;
  summary: CheckionDomainScanSummary;
};

export const executeCheckionDomainScan: CapabilityExecutor = async (input, ctx) =>
  executeCheckionDomainScanCapability(input, ctx);

export async function executeCheckionDomainScanCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult & { agentPayload?: CheckionDomainScanFlowPayload | CheckionDomainScanAgentPayload }> {
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (!url) return { ok: false, error: 'URL fehlt', catalogRoot: 'domain' };

  const projectId = (ctx.checkionProjectId ?? '').trim();
  if (!projectId) {
    return { ok: false, error: 'Checkion projectId fehlt', catalogRoot: 'domain' };
  }

  const maxPages =
    typeof input.maxPages === 'number' && Number.isFinite(input.maxPages)
      ? input.maxPages
      : undefined;
  const existingScanId =
    typeof input.existingScanId === 'string' ? input.existingScanId.trim() : undefined;
  const onStarted =
    typeof input.onStarted === 'function'
      ? (input.onStarted as (scan: CheckionDomainScanSummary) => void | Promise<void>)
      : undefined;

  const result = await runCheckionDomainScanV3({
    projectId,
    url,
    maxPages,
    reuseExistingCompleted: ctx.source === 'flow',
    ...(existingScanId ? { existingScanId } : {}),
    ...(onStarted ? { onStarted } : {}),
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      catalogRoot: 'domain',
      catalogBundle: result.scan
        ? buildDomainCatalogBundle({
            status: result.scan.status || 'failed',
            overallScore: result.scan.overallScore,
            pageCount: result.scan.pageCount ?? null,
            scanId: result.scan.id,
            url: result.scan.url || url,
          })
        : undefined,
      agentPayload: result.scan ? { variant: 'flow', scan: result.scan } : undefined,
    };
  }

  const scan = result.scan;
  const catalogBundle = buildDomainCatalogBundle({
    status: scan.status,
    overallScore: scan.overallScore,
    pageCount: scan.pageCount ?? null,
    scanId: scan.id,
    url: scan.url || url,
  });

  if (ctx.source === 'agent') {
    const preview = await fetchCheckionDomainScanV3Preview(scan.id);
    if (!preview.ok) {
      return {
        ok: false,
        error: preview.error,
        catalogRoot: 'domain',
        catalogBundle,
        agentPayload: { variant: 'flow', scan },
      };
    }
    return {
      ok: true,
      catalogRoot: 'domain',
      catalogBundle,
      agentPayload: { variant: 'agent', scan: preview.preview, summary: scan },
    };
  }

  return {
    ok: true,
    catalogRoot: 'domain',
    catalogBundle,
    agentPayload: { variant: 'flow', scan },
  };
}
