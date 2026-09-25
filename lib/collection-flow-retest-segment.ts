/**
 * Enterprise E3 — Collection Flow `retest` segment.
 * Re-runs the upstream quality job, fetches CHECKION delta, writes `delta.*` catalog.
 * Spec: suite-enterprise-program.md § E3 · checkion scan-run-delta.md
 */

import { API_STATUS } from '@/lib/api-error-handler';
import {
  documentHasRetest,
  type CollectionFlowNode,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import {
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import {
  fetchCheckionDomainScanDelta,
  fetchCheckionGeoJobDelta,
  fetchCheckionScanDelta,
  type CheckionScanDeltaResult,
} from '@/lib/integrations/checkion-scan-delta-client';
import { runCheckionSingleScan } from '@/lib/integrations/checkion-scans-client';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  FLOW_SKIP_REASONS,
  isEnterpriseSoftSkipTemplate,
} from '@/lib/collection-flow-skip';

export type RetestSegmentResult =
  | {
      ok: true;
      ctx: CollectionFlowRunContext;
      delta: CheckionScanDeltaResult | null;
      skipped?: boolean;
      skipReason?: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
      ctx: CollectionFlowRunContext;
    };

function retestNode(nodes: CollectionFlowNode[]): CollectionFlowNode | undefined {
  return nodes.find((n) => n.kind === 'retest');
}

function readString(bundle: Record<string, unknown> | undefined, key: string): string | null {
  if (!bundle) return null;
  const v = bundle[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function buildDeltaCatalogBundle(delta: CheckionScanDeltaResult): Record<string, unknown> {
  return {
    kind: delta.kind,
    currentId: delta.currentId,
    previousId: delta.previousId,
    urlSet: delta.urlSet,
    newCount: delta.findings.new.length,
    goneCount: delta.findings.gone.length,
    sameCount: delta.findings.same.length,
    findings: delta.findings,
    scores: delta.scores,
    ...(delta.measurement ? { measurement: delta.measurement } : {}),
  };
}

/**
 * After quality (+ optional brand), re-run the page scan when a `retest` node exists
 * and write CHECKION Gegentest into catalog root `delta`.
 */
export async function runRetestSegment(input: {
  platformProjectId: string;
  checkionProjectId: string | null;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
}): Promise<RetestSegmentResult> {
  if (!documentHasRetest(input.doc)) {
    return {
      ok: true,
      ctx: input.ctx,
      delta: null,
      skipped: true,
      skipReason: FLOW_SKIP_REASONS.NODE_ABSENT,
    };
  }

  const node = retestNode(input.doc.nodes);
  if (!node) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'retest node missing',
      ctx: input.ctx,
    };
  }

  const scanBundle = input.ctx.outputs.scan;
  const domainBundle = input.ctx.outputs.domain;
  const geoBundle = input.ctx.outputs.geo;

  const baselineScanId = readString(scanBundle, 'id') ?? readString(scanBundle, 'pageScanId');
  const baselineDomainId = readString(domainBundle, 'id');
  const baselineGeoId = readString(geoBundle, 'id');

  // Prefer page scan retest when present; else domain; else geo delta-only.
  if (baselineScanId) {
    const projectId =
      input.checkionProjectId?.trim() ||
      (await getExternalProjectId(input.platformProjectId, 'checkion'));
    if (!projectId) {
      if (isEnterpriseSoftSkipTemplate(input.doc)) {
        return {
          ok: true,
          ctx: input.ctx,
          delta: null,
          skipped: true,
          skipReason: FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_CHECKION,
        };
      }
      return {
        ok: false,
        status: API_STATUS.BAD_REQUEST,
        message: 'CHECKION binding missing for retest',
        ctx: input.ctx,
      };
    }
    const url = readString(scanBundle, 'url');
    if (!url) {
      return {
        ok: false,
        status: API_STATUS.BAD_REQUEST,
        message: 'retest requires scan.url from upstream quality run',
        ctx: input.ctx,
      };
    }

    const started = await runCheckionSingleScan({
      projectId,
      url,
      mode: 'single',
      platformProjectId: input.platformProjectId,
    });
    if (!started.ok) {
      return {
        ok: false,
        status: API_STATUS.BAD_REQUEST,
        message: started.error,
        ctx: input.ctx,
      };
    }

    const current = started.scan;

    const deltaRes = await fetchCheckionScanDelta(current.id, baselineScanId);
    if (!deltaRes.ok) {
      return {
        ok: false,
        status: deltaRes.status === 409 ? 409 : API_STATUS.BAD_REQUEST,
        message: deltaRes.error === 'no_baseline' ? 'no_baseline' : deltaRes.error,
        ctx: input.ctx,
      };
    }

    let ctx = setContextBundle(
      input.ctx,
      'scan',
      {
        ...(scanBundle ?? {}),
        id: current.id,
        status: current.status,
        overallScore: current.overallScore,
        url: current.url || url,
        previousId: baselineScanId,
      },
      node.id
    );
    ctx = setContextBundle(ctx, 'delta', buildDeltaCatalogBundle(deltaRes.delta), node.id);
    return { ok: true, ctx, delta: deltaRes.delta };
  }

  if (baselineDomainId) {
    const deltaRes = await fetchCheckionDomainScanDelta(baselineDomainId);
    if (!deltaRes.ok) {
      return {
        ok: false,
        status: deltaRes.status === 409 ? 409 : API_STATUS.BAD_REQUEST,
        message: deltaRes.error === 'no_baseline' ? 'no_baseline' : deltaRes.error,
        ctx: input.ctx,
      };
    }
    const ctx = setContextBundle(
      input.ctx,
      'delta',
      buildDeltaCatalogBundle(deltaRes.delta),
      node.id
    );
    return { ok: true, ctx, delta: deltaRes.delta };
  }

  if (baselineGeoId) {
    const deltaRes = await fetchCheckionGeoJobDelta(baselineGeoId);
    if (!deltaRes.ok) {
      return {
        ok: false,
        status: deltaRes.status === 409 ? 409 : API_STATUS.BAD_REQUEST,
        message: deltaRes.error === 'no_baseline' ? 'no_baseline' : deltaRes.error,
        ctx: input.ctx,
      };
    }
    const ctx = setContextBundle(
      input.ctx,
      'delta',
      buildDeltaCatalogBundle(deltaRes.delta),
      node.id
    );
    return { ok: true, ctx, delta: deltaRes.delta };
  }

  return {
    ok: false,
    status: 409,
    message: 'no_baseline',
    ctx: input.ctx,
  };
}
