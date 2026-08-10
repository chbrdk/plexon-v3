/**
 * Wave 24 — Brandion Measured segment for Collection Test Flow.
 * Sync fixture analysis-run → catalog root `brand.*`.
 */

import { API_STATUS } from '@/lib/api-error-handler';
import {
  documentHasBrandMeasure,
  mergeGuidelineConfigOntoBrandMeasure,
  type CollectionFlowNode,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import {
  buildBrandCatalogBundle,
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import { createBrandionFixtureAnalysisRun } from '@/lib/integrations/brandion-analysis-runs-client';
import {
  getBindingsForPlatformProject,
  getExternalProjectId,
} from '@/lib/db/platform-project-bindings';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';

export type BrandMeasureSegmentOk = {
  ok: true;
  ctx: CollectionFlowRunContext;
  guidelineId: string;
  runId: string;
  passCount: number;
  failCount: number;
  status: string;
};

export type BrandMeasureSegmentFail = {
  ok: false;
  status: number;
  message: string;
  ctx: CollectionFlowRunContext;
};

export type BrandMeasureSegmentResult = BrandMeasureSegmentOk | BrandMeasureSegmentFail;

const DEFAULT_FIXTURE_ID = 'demo-landing-pass';

export async function assertBrandionBindingReady(
  platformProjectId: string
): Promise<{ ok: true; externalProjectId: string } | { ok: false; status: number; message: string }> {
  const externalProjectId = await getExternalProjectId(platformProjectId, 'brandion');
  if (!externalProjectId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'BRANDION binding missing — bind a Brandion project on this Collection',
    };
  }
  const rows = await getBindingsForPlatformProject(platformProjectId);
  const binding = rows.find((r) => r.productId === 'brandion');
  if (binding && binding.syncStatus !== PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: `BRANDION binding not in_sync (status: ${binding.syncStatus})`,
    };
  }
  return { ok: true, externalProjectId };
}

function brandMeasureNode(nodes: CollectionFlowNode[]): CollectionFlowNode | undefined {
  return nodes.find((n) => n.kind === 'brand_measure');
}

/** Run sync Brandion fixture evaluate and write `brand.*` catalog. */
export async function runBrandMeasureSegment(input: {
  platformProjectId: string;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
  plexonUserId?: string | null;
}): Promise<BrandMeasureSegmentResult> {
  if (!documentHasBrandMeasure(input.doc)) {
    return { ok: true, ctx: input.ctx, guidelineId: '', runId: '', passCount: 0, failCount: 0, status: 'skipped' };
  }

  const binding = await assertBrandionBindingReady(input.platformProjectId);
  if (!binding.ok) {
    return { ok: false, status: binding.status, message: binding.message, ctx: input.ctx };
  }

  const nodes = mergeGuidelineConfigOntoBrandMeasure(input.doc.nodes);
  const measure = brandMeasureNode(nodes);
  if (!measure) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'brand_measure node missing',
      ctx: input.ctx,
    };
  }

  const guidelineId = measure.guidelineId?.trim() || '';
  if (!guidelineId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'guidelineId missing — set on Guideline or Brand Measure node',
      ctx: input.ctx,
    };
  }

  const adapter = (measure.adapter?.trim() || 'fixture') as string;
  if (adapter !== 'fixture') {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: `brand_measure adapter "${adapter}" not supported in Wave 24 (use fixture)`,
      ctx: input.ctx,
    };
  }

  const fixtureId = measure.fixtureId?.trim() || DEFAULT_FIXTURE_ID;
  const created = await createBrandionFixtureAnalysisRun({
    guidelineId,
    fixtureId,
    plexonUserId: input.plexonUserId ?? null,
  });

  if (!created.ok) {
    const failedCtx = setContextBundle(
      input.ctx,
      'brand',
      buildBrandCatalogBundle({
        status: 'failed',
        guidelineId,
        runId: null,
        adapter,
        passCount: 0,
        failCount: 0,
        observationCount: 0,
      }),
      measure.id
    );
    return {
      ok: false,
      status: created.status && created.status >= 400 && created.status < 600
        ? created.status
        : API_STATUS.BAD_GATEWAY,
      message: created.error,
      ctx: failedCtx,
    };
  }

  const run = created.run;
  const passCount = run.passed;
  const failCount = run.failed;
  const observationCount = Array.isArray(run.observations) ? run.observations.length : 0;
  const status = run.status === 'completed' || run.status === 'failed' ? run.status : 'completed';

  const ctx = setContextBundle(
    input.ctx,
    'brand',
    buildBrandCatalogBundle({
      status,
      guidelineId: run.guidelineId || guidelineId,
      runId: run.id,
      adapter,
      passCount,
      failCount,
      observationCount,
    }),
    measure.id
  );

  return {
    ok: true,
    ctx,
    guidelineId: run.guidelineId || guidelineId,
    runId: run.id,
    passCount,
    failCount,
    status,
  };
}
