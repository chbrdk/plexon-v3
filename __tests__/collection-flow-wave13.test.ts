import { describe, expect, it } from 'vitest';
import {
  addParallelPersonaSibling,
  flowToRf,
  newCollectionFlowNodeFromPreset,
} from '@/lib/collection-flow-canvas';
import {
  createJourneyQualityTemplate,
  createPageQualityTemplate,
} from '@/lib/collection-test-flow';
import { PALETTE_QUALITY_GROUPS, presetById } from '@/lib/collection-flow-presets';
import { nodeIoSchemaForKind } from '@/lib/collection-flow-node-ports';
import { validateCollectionFlowForRun } from '@/lib/collection-flow-validate';

describe('Wave 13 compare presets + parallel persona', () => {
  it('exposes quality/compare palette presets', () => {
    expect(PALETTE_QUALITY_GROUPS.map((g) => g.id)).toEqual(['qualität', 'vergleich']);
    expect(presetById('compare-score-70')?.defaults.path).toBe('scan.overallScore');
    expect(presetById('compare-journey-done')?.defaults).toMatchObject({
      path: 'journey.taskCompleted',
      op: 'eq',
      value: true,
    });
    const node = newCollectionFlowNodeFromPreset('compare-no-critical');
    expect(node.kind).toBe('compare');
    expect(node.path).toBe('scan.issues.criticalCount');
    expect(node.presetId).toBe('compare-no-critical');
  });

  it('adds parallel out ports on zielgruppe/persona', () => {
    expect(nodeIoSchemaForKind('zielgruppe').controlOutputs.map((o) => o.handleId)).toEqual([
      'then',
      'parallel',
    ]);
    expect(nodeIoSchemaForKind('persona').controlOutputs.some((o) => o.handleId === 'parallel')).toBe(
      true
    );
  });

  it('wires a parallel persona sibling from zielgruppe', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    const { nodes, edges } = flowToRf(doc);
    const zg = nodes.find((n) => n.data.flowNode.kind === 'zielgruppe')!;
    const next = addParallelPersonaSibling(nodes, edges, zg.id);
    expect(next.newId).toBeTruthy();
    expect(next.nodes.filter((n) => n.data.flowNode.kind === 'persona')).toHaveLength(2);
    expect(
      next.edges.some(
        (e) => e.data?.edgeKind === 'parallel' && e.source === zg.id && e.target === next.newId
      )
    ).toBe(true);
  });

  it('warns on parallel persona edges during validate', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    doc.nodes.push({
      id: 'n-persona-2',
      kind: 'persona',
      label: 'P2',
      personaId: 'p-2',
      personaName: 'Second',
    });
    doc.edges.push({
      id: 'e-par',
      source: 'n-zielgruppe',
      target: 'n-persona-2',
      edgeKind: 'parallel',
    });
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === 'parallel_persona_authoring')).toBe(false);
  });

  it('still accepts page-quality with compare presets fields', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    expect(validateCollectionFlowForRun(doc).ok).toBe(true);
  });
});
