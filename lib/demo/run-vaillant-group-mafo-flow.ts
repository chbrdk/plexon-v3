/**
 * Operator/bootstrap runner for Vaillant Group MaFo Collection flows (UC1 / UC2).
 * Uses the same executor as UI Testen — no HTTP session required.
 */

import {
  COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
  COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
  ensureFlowDocument,
} from '@/lib/collection-test-flow';
import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import {
  createCollectionFlowRun,
  listRecentCollectionFlowRuns,
  patchCollectionFlowRun,
} from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow, listCollectionTestFlows } from '@/lib/db/collection-test-flows';
import {
  documentHasDomainScanNode,
  ensureVaillantCheckionCorpus,
  spinesForMafoFlowKind,
} from '@/lib/demo/ensure-vaillant-checkion-corpus';
import {
  VAILLANT_GROUP_FLOW_UC2_TEMPLATE_ID,
  VAILLANT_GROUP_FLOW_TEMPLATE_ID,
  isVaillantGroupCollection,
} from '@/lib/demo/vaillant-group-mafo';
import { fetchCheckionDomainScanV3Detail } from '@/lib/integrations/checkion-domain-scans-v3-client';

export type VaillantMafoFlowKind = 'uc1' | 'uc2';

export type RunVaillantGroupMafoFlowResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  platformProjectId?: string;
  flowId?: string;
  historyRunId?: string;
  status?: string;
  error?: string;
};

const TEMPLATE_BY_KIND: Record<VaillantMafoFlowKind, string[]> = {
  uc1: [
    COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
    VAILLANT_GROUP_FLOW_TEMPLATE_ID,
  ],
  uc2: [
    COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
    VAILLANT_GROUP_FLOW_UC2_TEMPLATE_ID,
  ],
};

async function resolveFlowId(
  platformProjectId: string,
  kind: VaillantMafoFlowKind,
): Promise<string | null> {
  const templates = new Set(TEMPLATE_BY_KIND[kind]);
  const rows = await listCollectionTestFlows(platformProjectId);
  const row = rows.find((r) => {
    if (r.templateId && templates.has(r.templateId)) return true;
    const doc = ensureFlowDocument(r.flow);
    return doc.templateId != null && templates.has(doc.templateId);
  });
  return row?.id ?? null;
}

async function flowHasCompletedRun(
  platformProjectId: string,
  flowId: string,
): Promise<boolean> {
  const row = await getCollectionTestFlow(platformProjectId, flowId);
  if (!row) return false;
  const doc = ensureFlowDocument(row.flow);
  if (doc.lastRun?.status === 'complete') return true;

  const recent = await listRecentCollectionFlowRuns(platformProjectId, flowId, 3);
  return recent.some((r) => r.status === 'complete');
}

const DOMAIN_SCAN_TERMINAL_OK = new Set(['completed', 'complete']);

async function domainScanStepReady(
  domainScanId: string | null | undefined,
  scanStatus: string | null | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (domainScanId) {
    const detail = await fetchCheckionDomainScanV3Detail(domainScanId);
    if (!detail.ok) {
      return { ok: false, error: detail.error };
    }
    const status = String(detail.scan.status ?? '').toLowerCase();
    if (DOMAIN_SCAN_TERMINAL_OK.has(status)) {
      return { ok: true };
    }
    return {
      ok: false,
      error: `Domain scan ${domainScanId} not completed (status=${detail.scan.status})`,
    };
  }
  const status = String(scanStatus ?? '').toLowerCase();
  if (DOMAIN_SCAN_TERMINAL_OK.has(status)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: `Domain scan step not completed (status=${scanStatus ?? 'unknown'})`,
  };
}

export async function runVaillantGroupMafoFlow(input: {
  platformProjectId: string;
  kind: VaillantMafoFlowKind;
  /** Skip when flow already has a completed run (idempotent bootstrap). */
  ifPending?: boolean;
}): Promise<RunVaillantGroupMafoFlowResult> {
  const platformProjectId = input.platformProjectId.trim();
  if (!isVaillantGroupCollection(platformProjectId)) {
    return { ok: false, error: 'Not the Vaillant Group Collection.' };
  }

  const flowId = await resolveFlowId(platformProjectId, input.kind);
  if (!flowId) {
    return { ok: false, error: `No ${input.kind.toUpperCase()} flow found — run bootstrap first.` };
  }

  if (input.ifPending && (await flowHasCompletedRun(platformProjectId, flowId))) {
    return {
      ok: true,
      skipped: true,
      reason: 'already_complete',
      platformProjectId,
      flowId,
    };
  }

  const row = await getCollectionTestFlow(platformProjectId, flowId);
  if (!row) {
    return { ok: false, error: 'Flow row missing after resolve.' };
  }

  const doc = ensureFlowDocument(row.flow);

  const corpus = await ensureVaillantCheckionCorpus({
    platformProjectId,
    spines: spinesForMafoFlowKind(input.kind),
    waitForCompletion: true,
  });
  if (!corpus.ok) {
    const spineErrors = corpus.spines
      .filter((s) => !s.ok)
      .map((s) => `${s.spine}: ${s.error ?? 'failed'}`)
      .join('; ');
    return {
      ok: false,
      platformProjectId,
      flowId,
      error: spineErrors || corpus.error || 'CHECKION corpus not ready',
    };
  }

  const run = await createCollectionFlowRun({
    flowId,
    platformProjectId,
    trigger: 'service',
    status: 'running',
    request: { kind: input.kind, source: 'vaillant-mafo-bootstrap' },
  });

  const result = await executeCollectionFlowRun({
    platformProjectId,
    flowId,
    flowName: row.name,
    doc,
    body: { historyRunId: run.id },
    updatedByUserId: null,
  });

  if (!result.ok) {
    await patchCollectionFlowRun({
      runId: run.id,
      status: 'error',
      error: result.message,
    });
    return {
      ok: false,
      platformProjectId,
      flowId,
      historyRunId: run.id,
      error: result.message,
    };
  }

  if (documentHasDomainScanNode(doc.nodes)) {
    const domainReady = await domainScanStepReady(
      result.lastRun.domainScanId,
      result.lastRun.status,
    );
    if (!domainReady.ok) {
      await patchCollectionFlowRun({
        runId: run.id,
        status: 'error',
        error: domainReady.error ?? 'Domain scan not completed',
        verdict: result.verdict,
        lastRun: result.lastRun,
      });
      return {
        ok: false,
        platformProjectId,
        flowId,
        historyRunId: run.id,
        status: 'error',
        error: domainReady.error,
      };
    }
  }

  const runStatus =
    result.lastRun.status === 'awaiting_input'
      ? 'awaiting_input'
      : result.verdict.status === 'error' || result.lastRun.status === 'error'
        ? 'error'
        : 'complete';

  await patchCollectionFlowRun({
    runId: run.id,
    status: runStatus,
    verdict: result.verdict,
    lastRun: result.lastRun,
    error: result.lastRun.error ?? null,
  });

  return {
    ok: runStatus !== 'error',
    platformProjectId,
    flowId,
    historyRunId: run.id,
    status: runStatus,
    error: result.lastRun.error ?? undefined,
  };
}
