import { describe, expect, it, vi } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import {
  buildPlaybookRecipe,
  buildPromotedFlowDocument,
  classifyPromoteTrace,
  extractPromoteTraceFromHistory,
  persistPromotedFlow,
} from '@/lib/capabilities/promote';
import { createCollectionTestFlow, toCollectionTestFlowResponse } from '@/lib/db/collection-test-flows';

vi.mock('@/lib/db/collection-test-flows', () => ({
  createCollectionTestFlow: vi.fn(),
  toCollectionTestFlowResponse: vi.fn((row) => ({
    id: row.id,
    platformProjectId: row.platformProjectId,
    name: row.name,
    templateId: row.templateId,
    ownerId: row.ownerId,
    flow: row.flow,
    webhookEnabled: false,
    webhookSecretHint: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}));

describe('Wave C3 — promote capability sequence', () => {
  it('routes promote intents', () => {
    expect(routeAssistantIntent('Als Flow speichern').type).toBe('promote_capability_sequence');
    expect(routeAssistantIntent('Flow speichern bestätigen')).toMatchObject({
      type: 'promote_capability_sequence',
      confirm: true,
    });
    expect(routeAssistantIntent('Als Rezept speichern').type).toBe('promote_capability_sequence');
    expect(
      routeAssistantIntent('Flow speichern bestätigen als „Scan + GEO“')
    ).toMatchObject({
      type: 'promote_capability_sequence',
      confirm: true,
      name: 'Scan + GEO',
    });
  });

  it('extracts workflow trace from history', () => {
    const steps = extractPromoteTraceFromHistory([
      { role: 'user', content: 'Scanne https://a.test' },
      {
        role: 'assistant',
        content: 'Scan ok',
        metadata: { workflowType: 'quick_scan' },
      },
      { role: 'user', content: 'GEO für https://a.test' },
      {
        role: 'assistant',
        content: 'GEO ok',
        metadata: { workflowType: 'geo_analysis' },
      },
    ]);
    expect(steps.map((s) => s.capabilityId)).toEqual([
      'checkion.scan',
      'checkion.geo_job',
    ]);
    expect(steps[0].inputs?.url).toBe('https://a.test');
  });

  it('builds flow document for scan→geo', () => {
    const built = buildPromotedFlowDocument(
      [
        { capabilityId: 'checkion.scan', inputs: { url: 'https://a.test' } },
        { capabilityId: 'checkion.geo_job', inputs: { url: 'https://a.test' } },
      ],
      { name: 'Scan + GEO' }
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.preview.name).toBe('Scan + GEO');
    expect(built.preview.doc.nodes.some((n) => n.kind === 'scan')).toBe(true);
    expect(built.preview.doc.nodes.some((n) => n.kind === 'geo_job')).toBe(true);
    expect(built.preview.doc.nodes.some((n) => n.kind === 'compare')).toBe(true);
    expect(built.preview.doc.templateId).toBe('assistant-promote-v1');
  });

  it('explore-only → playbook recipe, not flow', () => {
    const classified = classifyPromoteTrace([
      { capabilityId: 'brandion.tokens_list' },
      { capabilityId: 'audion.persona.read' },
    ]);
    expect(classified).toMatchObject({ ok: true, target: 'playbook' });

    const flow = buildPromotedFlowDocument([
      { capabilityId: 'brandion.tokens_list' },
      { capabilityId: 'audion.persona.read' },
    ]);
    expect(flow.ok).toBe(false);

    const recipe = buildPlaybookRecipe([
      { capabilityId: 'brandion.tokens_list' },
      { capabilityId: 'audion.persona.read' },
    ]);
    expect(recipe.ok).toBe(true);
    if (!recipe.ok) return;
    expect(recipe.recipe.prompt.length).toBeGreaterThan(10);
  });

  it('rejects scan without url', () => {
    const built = buildPromotedFlowDocument([{ capabilityId: 'checkion.scan', inputs: {} }]);
    expect(built).toMatchObject({ ok: false, code: 'unbound_required_input' });
  });

  it('persistPromotedFlow creates new flow', async () => {
    vi.mocked(createCollectionTestFlow).mockResolvedValue({
      id: 'flow-new',
      platformProjectId: 'pp-1',
      name: 'Scan + GEO',
      templateId: 'assistant-promote-v1',
      ownerId: 'u1',
      flow: { nodes: [], edges: [] },
      webhookEnabled: false,
      webhookSecretHint: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const built = buildPromotedFlowDocument(
      [{ capabilityId: 'checkion.scan', inputs: { url: 'https://a.test' } }],
      { name: 'Scan + GEO' }
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const saved = await persistPromotedFlow({
      platformProjectId: 'pp-1',
      name: built.preview.name,
      doc: built.preview.doc,
      ownerId: 'u1',
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.boardPath).toContain('/flows/flow-new');
    expect(createCollectionTestFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        platformProjectId: 'pp-1',
        templateId: 'assistant-promote-v1',
        name: 'Scan + GEO',
      })
    );
    expect(toCollectionTestFlowResponse).toHaveBeenCalled();
  });
});
