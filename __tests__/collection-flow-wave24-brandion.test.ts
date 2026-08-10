/**
 * Wave 24 — Brandion Marke nodes in Collection Test Flow.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  COLLECTION_FLOW_NODE_KINDS,
  documentHasBrandMeasure,
  mergeGuidelineConfigOntoBrandMeasure,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import { PALETTE_BRAND_GROUPS, presetById } from '@/lib/collection-flow-presets';
import { nodeIoSchemaForKind } from '@/lib/collection-flow-node-ports';
import {
  actionKindForCatalogRoot,
  buildBrandCatalogBundle,
  catalogPortsForActionKind,
  emptyRunContext,
  evaluateCompareNode,
  resolveCatalogPath,
  setContextBundle,
} from '@/lib/collection-flow-run-context';
import { newCollectionFlowNode } from '@/lib/collection-flow-canvas';
import { executeBrandCollectionFlowRun } from '@/lib/collection-flow-brand-execute';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getExternalProjectId: vi.fn(async () => 'brand-ext-1'),
  getBindingsForPlatformProject: vi.fn(async () => [
    { productId: 'brandion', syncStatus: 'in_sync', externalProjectId: 'brand-ext-1' },
  ]),
}));

vi.mock('@/lib/integrations/brandion-analysis-runs-client', () => ({
  createBrandionFixtureAnalysisRun: vi.fn(async () => ({
    ok: true as const,
    run: {
      id: 'run-1',
      guidelineId: 'gl-demo-1',
      status: 'completed',
      passed: 8,
      failed: 0,
      skipped: 1,
      observations: [{ id: 'o1' }, { id: 'o2' }],
      results: [],
    },
  })),
}));

vi.mock('@/lib/db/collection-test-flows', () => ({
  persistFlowRunResult: vi.fn(async () => null),
  toCollectionTestFlowResponse: vi.fn(() => null),
}));

describe('Wave 24 Brandion kinds + palette', () => {
  it('registers guideline + brand_measure kinds', () => {
    expect(COLLECTION_FLOW_NODE_KINDS).toContain('guideline');
    expect(COLLECTION_FLOW_NODE_KINDS).toContain('brand_measure');
  });

  it('palette Marke group includes Guideline, Brand Measure, compares', () => {
    expect(PALETTE_BRAND_GROUPS.some((g) => g.id === 'marke')).toBe(true);
    const ids = PALETTE_BRAND_GROUPS.flatMap((g) => g.presets.map((p) => p.id));
    expect(ids).toEqual(
      expect.arrayContaining([
        'guideline',
        'brand_measure',
        'compare-brand-pass-rate',
        'compare-brand-no-fails',
      ])
    );
    expect(presetById('brand_measure')?.defaults.fixtureId).toBe('demo-landing-pass');
    expect(presetById('compare-brand-no-fails')?.defaults.path).toBe('brand.failCount');
  });

  it('board source wires PALETTE_BRAND_GROUPS', () => {
    const board = readFileSync(
      join(process.cwd(), 'components/flows/CollectionFlowBoard.tsx'),
      'utf8'
    );
    expect(board).toContain('PALETTE_BRAND_GROUPS');
    const presets = readFileSync(join(process.cwd(), 'lib/collection-flow-presets.ts'), 'utf8');
    expect(presets).toMatch(/group:\s*'marke'/);
  });

  it('ports + catalog root brand', () => {
    expect(nodeIoSchemaForKind('guideline').catalogOutputs).toBe(false);
    expect(nodeIoSchemaForKind('brand_measure').catalogOutputs).toBe(true);
    expect(actionKindForCatalogRoot('brand')).toBe('brand_measure');
    expect(catalogPortsForActionKind('brand_measure').some((p) => p.path === 'brand.passRate')).toBe(
      true
    );
    const node = newCollectionFlowNode('brand_measure');
    expect(node).toMatchObject({
      kind: 'brand_measure',
      adapter: 'fixture',
      fixtureId: 'demo-landing-pass',
    });
  });
});

describe('Wave 24 brand catalog + merge', () => {
  it('buildBrandCatalogBundle computes passRate', () => {
    const bundle = buildBrandCatalogBundle({
      status: 'completed',
      guidelineId: 'gl-1',
      runId: 'r1',
      adapter: 'fixture',
      passCount: 3,
      failCount: 1,
      observationCount: 4,
    });
    expect(bundle.passRate).toBe(0.75);
    expect(bundle.failCount).toBe(1);
  });

  it('mergeGuidelineConfigOntoBrandMeasure fills missing guidelineId', () => {
    const nodes = mergeGuidelineConfigOntoBrandMeasure([
      { id: 'g', kind: 'guideline', label: 'G', guidelineId: 'gl-demo-1' },
      { id: 'm', kind: 'brand_measure', label: 'M', fixtureId: 'demo-landing-pass' },
    ]);
    expect(nodes.find((n) => n.kind === 'brand_measure')?.guidelineId).toBe('gl-demo-1');
  });

  it('compare brand.failCount eq 0', () => {
    const ctx = setContextBundle(
      emptyRunContext(),
      'brand',
      buildBrandCatalogBundle({
        status: 'completed',
        guidelineId: 'gl-1',
        runId: 'r1',
        adapter: 'fixture',
        passCount: 5,
        failCount: 0,
        observationCount: 5,
      })
    );
    expect(resolveCatalogPath(ctx, 'brand.passRate')).toBe(1);
    const cmp = evaluateCompareNode(
      {
        id: 'c',
        kind: 'compare',
        label: 'No fails',
        path: 'brand.failCount',
        op: 'eq',
        value: 0,
      },
      ctx
    );
    expect(cmp.passed).toBe(true);
  });
});

describe('Wave 24 brand execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes brand.* catalog from mocked Brandion run', async () => {
    const doc: CollectionTestFlowDocument = {
      schemaVersion: '2026-08-collection-flow-v1',
      templateId: 'page-quality',
      nodes: [
        { id: 'g', kind: 'guideline', label: 'Guideline', guidelineId: 'gl-demo-1' },
        {
          id: 'm',
          kind: 'brand_measure',
          label: 'Brand Measure',
          fixtureId: 'demo-landing-pass',
          adapter: 'fixture',
        },
        {
          id: 'c',
          kind: 'compare',
          label: 'No fails',
          path: 'brand.failCount',
          op: 'eq',
          value: 0,
        },
      ],
      edges: [
        { id: 'e1', source: 'g', target: 'm', edgeKind: 'then' },
        { id: 'e2', source: 'm', target: 'c', edgeKind: 'then' },
      ],
      journeyFlow: null,
      lastVerdict: null,
      lastRun: null,
    };
    expect(documentHasBrandMeasure(doc)).toBe(true);

    const result = await executeBrandCollectionFlowRun({
      platformProjectId: 'pp-1',
      flowId: 'flow-1',
      flowName: 'Brand smoke',
      doc,
      body: {},
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const brand = result.lastRun.context?.outputs.brand as Record<string, unknown>;
    expect(brand).toMatchObject({
      status: 'completed',
      guidelineId: 'gl-demo-1',
      runId: 'run-1',
      passCount: 8,
      failCount: 0,
      passRate: 1,
    });
    expect(result.lastRun.compareResults?.every((r) => r.passed)).toBe(true);
  });
});

describe('Wave 24 specs', () => {
  it('collection-test-flow.md documents Family D + Wave 24', () => {
    const spec = readFileSync(
      join(process.cwd(), 'specs/domain/collection-test-flow.md'),
      'utf8'
    );
    expect(spec).toMatch(/Family D/i);
    expect(spec).toMatch(/Wave\s*24/i);
    expect(spec).toContain('brand_measure');
    expect(spec).toContain('brand.passRate');
  });
});
