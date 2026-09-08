/**
 * VIDEON V6 Capability Catalog + Flow media mapping.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  capabilityIdFromFlowNodeKind,
  FLOW_ORCHESTRATION_KINDS,
  getCapability,
  listCapabilities,
  validateCapabilityCatalog,
} from '@/lib/capabilities';
import { executeVideonAnalysisRunCapability } from '@/lib/capabilities/executors/videon-analysis-run';
import {
  buildCreationVideonBrandFlowTemplate,
  COLLECTION_FLOW_NODE_KINDS,
  flowHasVideonNodes,
  mergeVideonMediaAssetId,
} from '@/lib/collection-test-flow';
import { PALETTE_MEDIA_GROUPS } from '@/lib/collection-flow-presets';
import {
  catalogPortsForActionKind,
  emptyRunContext,
  resolveCatalogPath,
  setMediaCatalogLeaf,
  buildMediaAnalysisCatalogBundle,
} from '@/lib/collection-flow-run-context';

describe('VIDEON V6 capability catalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists videon pilot capability ids', () => {
    expect(validateCapabilityCatalog()).toEqual([]);
    const ids = listCapabilities().map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'videon.media.search',
        'videon.analysis.get',
        'videon.analysis.run',
        'videon.cut.create',
        'videon.cut.scenes.add',
        'videon.export.run',
        'videon.reframe.run',
      ])
    );
    expect(getCapability('videon.analysis.run')?.owner).toBe('videon');
    expect(getCapability('videon.export.run')?.surfaces).toEqual({ agent: false, flow: true });
    expect(getCapability('videon.reframe.run')?.surfaces).toEqual({ agent: true, flow: false });
    expect(getCapability('videon.reframe.run')?.agent?.toolNames).toContain('videon_reframe_run');
    expect(getCapability('videon.cut.scenes.add')?.surfaces).toEqual({ agent: true, flow: false });
    expect(getCapability('videon.cut.scenes.add')?.agent?.toolNames).toContain('videon_cut_scenes_add');
  });

  it('maps flow node kinds to videon capabilities; videon_media is orchestration', () => {
    expect(capabilityIdFromFlowNodeKind('videon_analysis_run')).toBe('videon.analysis.run');
    expect(capabilityIdFromFlowNodeKind('videon_cut_create')).toBe('videon.cut.create');
    expect(capabilityIdFromFlowNodeKind('videon_export_run')).toBe('videon.export.run');
    expect(FLOW_ORCHESTRATION_KINDS.has('videon_media')).toBe(true);
    expect(capabilityIdFromFlowNodeKind('videon_media')).toBeNull();
  });

  it('analysis_run executor returns ok with mocked fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            analysis: { id: 'ar-1', status: 'queued' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    process.env.NEXT_PUBLIC_VIDEON_URL = 'https://videon.test';
    process.env.PLEXON_SERVICE_SECRET = 'test-secret';

    const result = await executeVideonAnalysisRunCapability(
      { platformProjectId: 'col-1', mediaAssetId: 'media-1' },
      { source: 'flow', platformProjectId: 'col-1', actorUserId: 'user-1' }
    );

    expect(result.ok).toBe(true);
    expect(result.catalogRoot).toBe('media.analysis');
    expect(result.catalogBundle).toMatchObject({
      status: 'queued',
      mediaAssetId: 'media-1',
      analysisRunId: 'ar-1',
      platformProjectId: 'col-1',
    });
    expect(fetch).toHaveBeenCalled();
  });
});

describe('VIDEON V6 collection flow media family', () => {
  it('registers media kinds + Media palette', () => {
    expect(COLLECTION_FLOW_NODE_KINDS).toEqual(
      expect.arrayContaining([
        'videon_media',
        'videon_analysis_run',
        'videon_cut_create',
        'videon_export_run',
      ])
    );
    const ids = PALETTE_MEDIA_GROUPS.flatMap((g) => g.presets.map((p) => p.id));
    expect(ids).toEqual(
      expect.arrayContaining([
        'videon_media',
        'videon_analysis_run',
        'videon_cut_create',
        'videon_export_run',
      ])
    );
  });

  it('merges mediaAssetId and exposes nested media.analysis catalog paths', () => {
    const merged = mergeVideonMediaAssetId([
      { id: 'm', kind: 'videon_media', label: 'Media', mediaAssetId: 'asset-9' },
      { id: 'a', kind: 'videon_analysis_run', label: 'Analysis' },
    ]);
    expect(merged.find((n) => n.kind === 'videon_analysis_run')?.mediaAssetId).toBe('asset-9');

    const ctx = setMediaCatalogLeaf(
      emptyRunContext(),
      'analysis',
      buildMediaAnalysisCatalogBundle({
        status: 'queued',
        mediaAssetId: 'asset-9',
        analysisRunId: 'ar-1',
        platformProjectId: 'col-1',
      }),
      'a'
    );
    expect(resolveCatalogPath(ctx, 'media.analysis.status')).toBe('queued');
    expect(resolveCatalogPath(ctx, 'media.analysis.mediaAssetId')).toBe('asset-9');
    expect(catalogPortsForActionKind('videon_analysis_run').map((p) => p.path)).toContain(
      'media.analysis.status'
    );
  });

  it('buildCreationVideonBrandFlowTemplate wires media → analysis → brand', () => {
    const doc = buildCreationVideonBrandFlowTemplate({
      mediaAssetId: 'm-1',
      guidelineId: 'gl-1',
    });
    expect(flowHasVideonNodes(doc)).toBe(true);
    expect(doc.nodes.map((n) => n.kind)).toEqual([
      'start',
      'videon_media',
      'videon_analysis_run',
      'brand_measure',
      'success',
    ]);
    expect(doc.nodes.find((n) => n.kind === 'videon_media')?.mediaAssetId).toBe('m-1');
    expect(doc.nodes.find((n) => n.kind === 'brand_measure')?.guidelineId).toBe('gl-1');
  });
});
