/**
 * Shared `checkion.scan` capability executor (Wave C1.1).
 * Agent → legacy quick-scan HTTP; Flow → platform `/api/scans` poll.
 * Both write the same `scan.*` catalog root via shared normalizers.
 * @see specs/domain/capability-catalog.md
 */

import type { ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import {
  normalizeScanCatalogFromAgentPreview,
  normalizeScanCatalogFromFlowFields,
} from '@/lib/capabilities/catalog-normalize-scan';
import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';
import {
  runCheckionSingleScan,
  type CheckionScanSummary,
} from '@/lib/integrations/checkion-scans-client';
import type { CollectionFlowScanMode } from '@/lib/collection-test-flow';

export type CheckionScanAgentPayload = {
  variant: 'agent';
  scan: ScanResultPreview;
};

export type CheckionScanFlowPayload = {
  variant: 'flow';
  scan: CheckionScanSummary;
  scanMode: CollectionFlowScanMode;
};

export type CheckionScanCapabilityResult = CapabilityResult & {
  agentPayload?: CheckionScanAgentPayload | CheckionScanFlowPayload;
};

function parseScanMode(raw: unknown): CollectionFlowScanMode {
  return raw === 'deep' ? 'deep' : 'single';
}

export const executeCheckionScan: CapabilityExecutor = async (input, ctx) => {
  return executeCheckionScanCapability(input, ctx);
};

export async function executeCheckionScanCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CheckionScanCapabilityResult> {
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (!url) {
    return { ok: false, error: 'URL fehlt', catalogRoot: 'scan' };
  }

  if (ctx.source === 'flow') {
    const projectId = (ctx.checkionProjectId ?? '').trim();
    if (!projectId) {
      return { ok: false, error: 'Checkion projectId fehlt', catalogRoot: 'scan' };
    }
    const scanMode = parseScanMode(input.scanMode);
    const audionRunId =
      typeof input.audionRunId === 'string' ? input.audionRunId : null;
    const stepUrl = typeof input.stepUrl === 'string' ? input.stepUrl : null;

    const scanResult = await runCheckionSingleScan({
      projectId,
      url,
      mode: scanMode,
      platformProjectId: ctx.platformProjectId,
      audionRunId,
      stepUrl: stepUrl ?? url,
    });

    if (!scanResult.ok) {
      const failed = scanResult.scan;
      return {
        ok: false,
        error: scanResult.error,
        catalogRoot: 'scan',
        catalogBundle: failed
          ? normalizeScanCatalogFromFlowFields({
              status: failed.status || 'failed',
              overallScore: failed.overallScore,
              url: failed.url || url,
              issueCount: failed.issueCount ?? 0,
            })
          : undefined,
        agentPayload: failed
          ? { variant: 'flow', scan: failed, scanMode }
          : undefined,
      };
    }

    const scan = scanResult.scan;
    return {
      ok: true,
      catalogRoot: 'scan',
      catalogBundle: normalizeScanCatalogFromFlowFields({
        status: scan.status,
        overallScore: scan.overallScore,
        url: scan.url || url,
        issueCount: scan.issueCount ?? 0,
        scoresByKind:
          typeof scan.overallScore === 'number'
            ? { accessibility: scan.overallScore }
            : null,
      }),
      agentPayload: { variant: 'flow', scan, scanMode },
    };
  }

  // Agent surface — preserve quick-scan product semantics
  const quick = await runCheckionQuickScan({
    url,
    checkionProjectId: ctx.checkionProjectId,
  });
  if (!quick.ok) {
    return { ok: false, error: quick.error, catalogRoot: 'scan' };
  }

  const scan = quick.scan;
  return {
    ok: true,
    catalogRoot: 'scan',
    catalogBundle: normalizeScanCatalogFromAgentPreview({
      id: scan.id,
      url: scan.url,
      score: scan.score,
      stats: scan.stats,
      issues: scan.issues.map((it, idx) => ({
        id: `issue-${idx}`,
        severity: it.type,
        ruleId: it.code || null,
        title: it.message || null,
      })),
    }),
    agentPayload: { variant: 'agent', scan },
  };
}
