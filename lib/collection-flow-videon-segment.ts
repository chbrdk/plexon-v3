/**
 * V6 — VIDEON Media segments for Collection Test Flow.
 * Direct Product HTTP by default; shared catalog executors when CAPABILITY_CATALOG_RUNTIME on.
 * @see specs/domain/collection-test-flow.md — Family E
 */

import { API_STATUS } from '@/lib/api-error-handler';
import { executeVideonAnalysisRunCapability } from '@/lib/capabilities/executors/videon-analysis-run';
import { executeVideonCutCreateCapability } from '@/lib/capabilities/executors/videon-cut-create';
import { executeVideonExportRunCapability } from '@/lib/capabilities/executors/videon-export-run';
import { isCapabilityCatalogRuntimeEnabled } from '@/lib/capabilities/runtime-flag';
import {
  buildMediaAnalysisCatalogBundle,
  buildMediaCutCatalogBundle,
  buildMediaExportCatalogBundle,
  resolveCatalogPath,
  setMediaCatalogLeaf,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import {
  flowHasVideonNodes,
  mergeVideonMediaAssetId,
  type CollectionFlowNode,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import {
  analysisRun,
  cutCreate,
  exportRun,
} from '@/lib/integrations/videon-product-client';

export type VideonSegmentOk = {
  ok: true;
  ctx: CollectionFlowRunContext;
  status: string;
};

export type VideonSegmentFail = {
  ok: false;
  status: number;
  message: string;
  ctx: CollectionFlowRunContext;
};

export type VideonSegmentResult = VideonSegmentOk | VideonSegmentFail;

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function findKind(nodes: CollectionFlowNode[], kind: CollectionFlowNode['kind']) {
  return nodes.find((n) => n.kind === kind);
}

function mergeCutIdFromCatalog(
  nodes: CollectionFlowNode[],
  ctx: CollectionFlowRunContext
): CollectionFlowNode[] {
  const cutIdFromCatalog = resolveCatalogPath(ctx, 'media.cut.cutId');
  const cutId =
    typeof cutIdFromCatalog === 'string' && cutIdFromCatalog.trim()
      ? cutIdFromCatalog.trim()
      : null;
  if (!cutId) return nodes;
  return nodes.map((n) => {
    if (n.kind !== 'videon_export_run') return n;
    if (n.cutId?.trim()) return n;
    return { ...n, cutId };
  });
}

export async function runVideonAnalysisSegment(input: {
  platformProjectId: string;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
  plexonUserId?: string | null;
}): Promise<VideonSegmentResult> {
  const nodes = mergeVideonMediaAssetId(input.doc.nodes);
  const node = findKind(nodes, 'videon_analysis_run');
  if (!node) {
    return { ok: true, ctx: input.ctx, status: 'skipped' };
  }

  const mediaAssetId = node.mediaAssetId?.trim() || '';
  if (!mediaAssetId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'mediaAssetId missing — set on Media or Analysis node',
      ctx: input.ctx,
    };
  }

  if (isCapabilityCatalogRuntimeEnabled()) {
    const cap = await executeVideonAnalysisRunCapability(
      { platformProjectId: input.platformProjectId, mediaAssetId },
      {
        source: 'flow',
        platformProjectId: input.platformProjectId,
        videonMediaAssetId: mediaAssetId,
        actorUserId: input.plexonUserId ?? null,
        nodeId: node.id,
      }
    );
    const bundle =
      (cap.catalogBundle as Record<string, unknown> | undefined) ??
      buildMediaAnalysisCatalogBundle({
        status: cap.ok ? 'queued' : 'failed',
        mediaAssetId,
        analysisRunId: null,
        platformProjectId: input.platformProjectId,
      });
    const ctx = setMediaCatalogLeaf(input.ctx, 'analysis', bundle, node.id);
    if (!cap.ok) {
      return {
        ok: false,
        status: API_STATUS.BAD_GATEWAY,
        message: cap.error ?? 'videon analysis failed',
        ctx,
      };
    }
    return {
      ok: true,
      ctx,
      status: typeof bundle.status === 'string' ? bundle.status : 'queued',
    };
  }

  const res = await analysisRun({
    platformProjectId: input.platformProjectId,
    mediaAssetId,
    actorUserId: input.plexonUserId ?? null,
  });
  if (!res.ok) {
    const ctx = setMediaCatalogLeaf(
      input.ctx,
      'analysis',
      buildMediaAnalysisCatalogBundle({
        status: 'failed',
        mediaAssetId,
        analysisRunId: null,
        platformProjectId: input.platformProjectId,
      }),
      node.id
    );
    return {
      ok: false,
      status:
        res.status >= 400 && res.status < 600 ? res.status : API_STATUS.BAD_GATEWAY,
      message: res.error,
      ctx,
    };
  }

  const row = asRecord(res.data);
  const analysis = asRecord(row.analysis);
  const analysisRunId =
    (typeof analysis.id === 'string' ? analysis.id : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof analysis.status === 'string' ? analysis.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';
  const ctx = setMediaCatalogLeaf(
    input.ctx,
    'analysis',
    buildMediaAnalysisCatalogBundle({
      status,
      mediaAssetId,
      analysisRunId,
      platformProjectId: input.platformProjectId,
    }),
    node.id
  );
  return { ok: true, ctx, status };
}

export async function runVideonCutCreateSegment(input: {
  platformProjectId: string;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
  plexonUserId?: string | null;
}): Promise<VideonSegmentResult> {
  const nodes = mergeVideonMediaAssetId(input.doc.nodes);
  const node = findKind(nodes, 'videon_cut_create');
  if (!node) {
    return { ok: true, ctx: input.ctx, status: 'skipped' };
  }

  const mediaAssetId = node.mediaAssetId?.trim() || '';
  const name = node.label?.trim() || node.text?.trim() || 'Cut';
  if (!mediaAssetId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'mediaAssetId missing — set on Media or Cut node',
      ctx: input.ctx,
    };
  }

  if (isCapabilityCatalogRuntimeEnabled()) {
    const cap = await executeVideonCutCreateCapability(
      { platformProjectId: input.platformProjectId, mediaAssetId, name },
      {
        source: 'flow',
        platformProjectId: input.platformProjectId,
        videonMediaAssetId: mediaAssetId,
        actorUserId: input.plexonUserId ?? null,
        nodeId: node.id,
      }
    );
    const bundle =
      (cap.catalogBundle as Record<string, unknown> | undefined) ??
      buildMediaCutCatalogBundle({
        status: cap.ok ? 'created' : 'failed',
        cutId: null,
        mediaAssetId,
        name,
        platformProjectId: input.platformProjectId,
      });
    const ctx = setMediaCatalogLeaf(input.ctx, 'cut', bundle, node.id);
    if (!cap.ok) {
      return {
        ok: false,
        status: API_STATUS.BAD_GATEWAY,
        message: cap.error ?? 'videon cut create failed',
        ctx,
      };
    }
    return {
      ok: true,
      ctx,
      status: typeof bundle.status === 'string' ? bundle.status : 'created',
    };
  }

  const res = await cutCreate({
    platformProjectId: input.platformProjectId,
    mediaAssetId,
    name,
    actorUserId: input.plexonUserId ?? null,
  });
  if (!res.ok) {
    const ctx = setMediaCatalogLeaf(
      input.ctx,
      'cut',
      buildMediaCutCatalogBundle({
        status: 'failed',
        cutId: null,
        mediaAssetId,
        name,
        platformProjectId: input.platformProjectId,
      }),
      node.id
    );
    return {
      ok: false,
      status:
        res.status >= 400 && res.status < 600 ? res.status : API_STATUS.BAD_GATEWAY,
      message: res.error,
      ctx,
    };
  }

  const row = asRecord(res.data);
  const cut = asRecord(row.cut);
  const cutId =
    (typeof cut.id === 'string' ? cut.id : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof cut.status === 'string' ? cut.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'created';
  const ctx = setMediaCatalogLeaf(
    input.ctx,
    'cut',
    buildMediaCutCatalogBundle({
      status,
      cutId,
      mediaAssetId,
      name: (typeof cut.name === 'string' ? cut.name : null) || name,
      platformProjectId: input.platformProjectId,
    }),
    node.id
  );
  return { ok: true, ctx, status };
}

export async function runVideonExportSegment(input: {
  platformProjectId: string;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
  plexonUserId?: string | null;
}): Promise<VideonSegmentResult> {
  const nodes = mergeCutIdFromCatalog(mergeVideonMediaAssetId(input.doc.nodes), input.ctx);
  const node = findKind(nodes, 'videon_export_run');
  if (!node) {
    return { ok: true, ctx: input.ctx, status: 'skipped' };
  }

  const cutId = node.cutId?.trim() || '';
  if (!cutId) {
    return {
      ok: false,
      status: API_STATUS.BAD_REQUEST,
      message: 'cutId missing — set on Export node or run Cut first',
      ctx: input.ctx,
    };
  }

  const formatRaw = typeof node.format === 'string' ? node.format.trim() : '';
  const format =
    formatRaw === 'mp4' || formatRaw === 'premiere_xml' ? formatRaw : undefined;

  if (isCapabilityCatalogRuntimeEnabled()) {
    const cap = await executeVideonExportRunCapability(
      {
        platformProjectId: input.platformProjectId,
        cutId,
        ...(format ? { format } : {}),
      },
      {
        source: 'flow',
        platformProjectId: input.platformProjectId,
        actorUserId: input.plexonUserId ?? null,
        nodeId: node.id,
      }
    );
    const bundle =
      (cap.catalogBundle as Record<string, unknown> | undefined) ??
      buildMediaExportCatalogBundle({
        status: cap.ok ? 'queued' : 'failed',
        exportId: null,
        cutId,
        platformProjectId: input.platformProjectId,
      });
    const ctx = setMediaCatalogLeaf(input.ctx, 'export', bundle, node.id);
    if (!cap.ok) {
      return {
        ok: false,
        status: API_STATUS.BAD_GATEWAY,
        message: cap.error ?? 'videon export failed',
        ctx,
      };
    }
    return {
      ok: true,
      ctx,
      status: typeof bundle.status === 'string' ? bundle.status : 'queued',
    };
  }

  const res = await exportRun({
    platformProjectId: input.platformProjectId,
    cutId,
    actorUserId: input.plexonUserId ?? null,
    format,
  });
  if (!res.ok) {
    const ctx = setMediaCatalogLeaf(
      input.ctx,
      'export',
      buildMediaExportCatalogBundle({
        status: 'failed',
        exportId: null,
        cutId,
        platformProjectId: input.platformProjectId,
      }),
      node.id
    );
    return {
      ok: false,
      status:
        res.status >= 400 && res.status < 600 ? res.status : API_STATUS.BAD_GATEWAY,
      message: res.error,
      ctx,
    };
  }

  const row = asRecord(res.data);
  const exportJob = asRecord(row.export ?? row.exportJob);
  const exportId =
    (typeof exportJob.id === 'string' ? exportJob.id : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof exportJob.status === 'string' ? exportJob.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';
  const ctx = setMediaCatalogLeaf(
    input.ctx,
    'export',
    buildMediaExportCatalogBundle({
      status,
      exportId,
      cutId,
      platformProjectId: input.platformProjectId,
    }),
    node.id
  );
  return { ok: true, ctx, status };
}

/** Run all present VIDEON Media action segments in order. */
export async function runVideonMediaSegments(input: {
  platformProjectId: string;
  doc: CollectionTestFlowDocument;
  ctx: CollectionFlowRunContext;
  plexonUserId?: string | null;
}): Promise<VideonSegmentResult> {
  if (!flowHasVideonNodes(input.doc)) {
    return { ok: true, ctx: input.ctx, status: 'skipped' };
  }

  let ctx = input.ctx;
  const analysis = await runVideonAnalysisSegment({ ...input, ctx });
  ctx = analysis.ctx;
  if (!analysis.ok) return analysis;

  const cut = await runVideonCutCreateSegment({ ...input, ctx });
  ctx = cut.ctx;
  if (!cut.ok) return cut;

  const exp = await runVideonExportSegment({ ...input, ctx });
  ctx = exp.ctx;
  if (!exp.ok) return exp;

  const status =
    exp.status !== 'skipped'
      ? exp.status
      : cut.status !== 'skipped'
        ? cut.status
        : analysis.status;
  return { ok: true, ctx, status };
}
