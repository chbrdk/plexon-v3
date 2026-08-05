import { describe, expect, it } from 'vitest';
import {
  createJourneyQualityTemplate,
  extractJourneyFlowFromDocument,
  listJourneyPersonaSlots,
} from '@/lib/collection-test-flow';
import { buildJourneyCatalogBundle } from '@/lib/collection-flow-run-context';
import { validateCollectionFlowForRun } from '@/lib/collection-flow-validate';
import { addParallelPersonaSibling, flowToRf, rfToDocument } from '@/lib/collection-flow-canvas';

describe('Wave 14 parallel persona runtime', () => {
  it('lists then + parallel persona slots from zielgruppe', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    const { nodes, edges } = flowToRf(doc);
    const zg = nodes.find((n) => n.data.flowNode.kind === 'zielgruppe')!;
    const next = addParallelPersonaSibling(nodes, edges, zg.id);
    const back = rfToDocument(doc, next.nodes, next.edges);
    // Assign catalog ids so slots are runnable
    for (const n of back.nodes) {
      if (n.kind === 'persona' && !n.personaId) {
        n.personaId = n.id === 'n-persona' ? 'p-primary' : 'p-parallel';
        n.personaName = n.personaId;
      }
    }
    const slots = listJourneyPersonaSlots(back);
    expect(slots.length).toBeGreaterThanOrEqual(2);
    expect(slots.filter((s) => s.primary)).toHaveLength(1);
    expect(slots.some((s) => s.via === 'parallel')).toBe(true);
  });

  it('extract merges forced persona onto start', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    doc.nodes.find((n) => n.kind === 'persona')!.personaId = 'p-a';
    doc.nodes.find((n) => n.kind === 'persona')!.personaName = 'Alpha';
    doc.nodes.push({
      id: 'n-persona-b',
      kind: 'persona',
      label: 'Beta',
      personaId: 'p-b',
      personaName: 'Beta',
    });
    doc.edges.push({
      id: 'e-par-b',
      source: 'n-zielgruppe',
      target: 'n-persona-b',
      edgeKind: 'parallel',
    });
    const a = extractJourneyFlowFromDocument(doc, 'https://a.test', { personaNodeId: 'n-persona' });
    const b = extractJourneyFlowFromDocument(doc, 'https://a.test', {
      personaNodeId: 'n-persona-b',
    });
    expect(a?.nodes[0]).toMatchObject({ personaId: 'p-a', personaName: 'Alpha' });
    expect(b?.nodes[0]).toMatchObject({ personaId: 'p-b', personaName: 'Beta' });
  });

  it('errors when parallel persona lacks catalog id', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    doc.nodes.push({
      id: 'n-persona-2',
      kind: 'persona',
      label: 'Unset parallel',
    });
    doc.edges.push({
      id: 'e-par',
      source: 'n-zielgruppe',
      target: 'n-persona-2',
      edgeKind: 'parallel',
    });
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'parallel_persona_unset')).toBe(true);
  });

  it('builds journey catalog with personaCount + allTaskCompleted', () => {
    const bundle = buildJourneyCatalogBundle({
      taskCompleted: true,
      validEvidence: true,
      finalUrl: 'https://a.test/done',
      personaCount: 2,
    });
    expect(bundle).toMatchObject({
      taskCompleted: true,
      allTaskCompleted: true,
      personaCount: 2,
      finalUrl: 'https://a.test/done',
    });
  });
});
