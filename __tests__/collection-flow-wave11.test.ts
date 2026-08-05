import { describe, expect, it } from 'vitest';
import {
  createJourneyQualityTemplate,
  extractJourneyFlowFromDocument,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import {
  isCatalogBindConnection,
  newCollectionFlowNodeFromPreset,
} from '@/lib/collection-flow-canvas';
import { catalogPortsForActionKind } from '@/lib/collection-flow-run-context';
import { nodeIoSchemaForKind } from '@/lib/collection-flow-node-ports';
import { PALETTE_JOURNEY_GROUPS, presetById } from '@/lib/collection-flow-presets';

describe('Wave 11 journey product nodes', () => {
  it('merges persona + zielgruppe onto extracted start and omits config kinds', () => {
    const doc: CollectionTestFlowDocument = {
      schemaVersion: '2026-08-collection-flow-v1',
      templateId: 'journey-quality',
      nodes: [
        {
          id: 'n-zg',
          kind: 'zielgruppe',
          label: 'ZG',
          targetGroupId: 'tg-1',
          targetGroupName: 'Parents',
          segment: 'parents',
        },
        {
          id: 'n-pe',
          kind: 'persona',
          label: 'Persona',
          personaId: 'p-9',
          personaName: 'Impatient Parent',
        },
        {
          id: 'n-start',
          kind: 'start',
          label: 'Start',
          url: 'https://a.test',
          urlKey: 'https://a.test',
        },
        { id: 'n-action', kind: 'action', label: 'Go', text: 'do it' },
        { id: 'n-success', kind: 'success', label: 'Done' },
        { id: 'n-scan', kind: 'scan', label: 'Scan', url: 'https://a.test' },
      ],
      edges: [
        { id: 'e1', source: 'n-zg', target: 'n-pe', edgeKind: 'then' },
        { id: 'e2', source: 'n-pe', target: 'n-start', edgeKind: 'then' },
        { id: 'e3', source: 'n-start', target: 'n-action', edgeKind: 'then' },
        { id: 'e4', source: 'n-action', target: 'n-success', edgeKind: 'then' },
        { id: 'e5', source: 'n-success', target: 'n-scan', edgeKind: 'then' },
      ],
      journeyFlow: null,
      lastVerdict: null,
      lastRun: null,
    };
    const extracted = extractJourneyFlowFromDocument(doc, 'https://a.test');
    expect(extracted?.nodes.map((n) => n.kind)).toEqual(['start', 'action', 'success']);
    expect(extracted?.nodes[0]).toMatchObject({
      kind: 'start',
      personaId: 'p-9',
      personaName: 'Impatient Parent',
      segment: 'parents',
    });
    expect(extracted?.edges).toEqual([
      expect.objectContaining({ from: 'n-start', to: 'n-action' }),
      expect.objectContaining({ from: 'n-action', to: 'n-success' }),
    ]);
  });

  it('passes measureKey through extract', () => {
    const doc = createJourneyQualityTemplate('https://a.test');
    const scanIdx = doc.nodes.findIndex((n) => n.kind === 'scan');
    doc.nodes.splice(scanIdx, 0, {
      id: 'n-frage',
      kind: 'measure',
      label: 'Ease',
      measureKey: 'ease',
      text: 'Wie leicht?',
    });
    doc.edges.push({
      id: 'e-success-frage',
      source: 'n-success',
      target: 'n-frage',
      edgeKind: 'then',
    });
    const extracted = extractJourneyFlowFromDocument(doc, 'https://a.test');
    const measure = extracted?.nodes.find((n) => n.kind === 'measure');
    expect(measure?.measureKey).toBe('ease');
  });

  it('action/frage presets create expected kinds and fields', () => {
    const action = newCollectionFlowNodeFromPreset('action-suchen');
    expect(action.kind).toBe('action');
    expect(action.presetId).toBe('action-suchen');
    expect(action.text).toMatch(/Suchfeld/);
    const frage = newCollectionFlowNodeFromPreset('frage-ease');
    expect(frage.kind).toBe('measure');
    expect(frage.measureKey).toBe('ease');
    expect(presetById('persona')?.kind).toBe('persona');
  });

  it('exposes journey catalog ports on success and allows bind', () => {
    expect(nodeIoSchemaForKind('success').catalogOutputs).toBe(true);
    expect(catalogPortsForActionKind('success').some((p) => p.path === 'journey.taskCompleted')).toBe(
      true
    );
    expect(
      isCatalogBindConnection('success', 'out:journey.taskCompleted', 'compare', 'bind:path')
    ).toBe(true);
  });

  it('palette groups cover kontext/schritte/messung/steuerung', () => {
    expect(PALETTE_JOURNEY_GROUPS.map((g) => g.id)).toEqual([
      'kontext',
      'schritte',
      'messung',
      'steuerung',
    ]);
    expect(PALETTE_JOURNEY_GROUPS[0]?.presets.some((p) => p.kind === 'zielgruppe')).toBe(true);
  });
});
