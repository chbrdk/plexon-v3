import { describe, expect, it } from 'vitest';
import {
  createMinimalAudionJourneyFlow,
  ensureFlowDocument,
  migrateOpaqueJourneyEmbed,
} from '@/lib/collection-test-flow';
import {
  buildDomainCatalogBundle,
  emptyRunContext,
  resolveFlowParamString,
  resolveRunUrlChain,
  setContextBundle,
} from '@/lib/collection-flow-run-context';
import { seedJourneyNodeOutputsIntoContext } from '@/lib/collection-flow-journey-context';

describe('Wave 22 — opaque journey thin', () => {
  it('migrateOpaqueJourneyEmbed expands stub into first-class nodes', () => {
    const embed = createMinimalAudionJourneyFlow('https://example.com');
    const doc = migrateOpaqueJourneyEmbed({
      schemaVersion: '2026-08-collection-flow-v1',
      templateId: 'journey-quality',
      nodes: [
        {
          id: 'n-journey',
          kind: 'journey',
          label: 'Journey',
          position: { x: 0, y: 100 },
        },
        { id: 'n-scan', kind: 'scan', label: 'Scan', url: 'https://example.com' },
      ],
      edges: [{ id: 'e-j-s', source: 'n-journey', target: 'n-scan', edgeKind: 'then' }],
      journeyFlow: embed,
    });
    expect(doc.nodes.some((n) => n.kind === 'journey')).toBe(false);
    expect(doc.nodes.some((n) => n.kind === 'start')).toBe(true);
    expect(doc.nodes.some((n) => n.kind === 'action')).toBe(true);
    expect(doc.edges.some((e) => e.source === 'n-success' && e.target === 'n-scan')).toBe(true);
  });

  it('ensureFlowDocument expands opaque journey on load', () => {
    const embed = createMinimalAudionJourneyFlow('https://a.test');
    const doc = ensureFlowDocument({
      nodes: [{ id: 'n-journey', kind: 'journey', label: 'Journey' }],
      edges: [],
      journeyFlow: embed,
    });
    expect(doc.nodes.find((n) => n.kind === 'start')?.urlKey || doc.nodes.find((n) => n.kind === 'start')?.url).toBeTruthy();
    expect(doc.nodes.some((n) => n.kind === 'journey')).toBe(false);
  });

  it('does not expand when first-class journey already present', () => {
    const embed = createMinimalAudionJourneyFlow('https://a.test');
    const doc = migrateOpaqueJourneyEmbed({
      schemaVersion: '2026-08-collection-flow-v1',
      templateId: 'journey-quality',
      nodes: [
        { id: 'n-start', kind: 'start', label: 'Start', url: 'https://a.test' },
        { id: 'n-action', kind: 'action', label: 'Go' },
        { id: 'orphan-journey', kind: 'journey', label: 'Legacy' },
      ],
      edges: [{ id: 'e1', source: 'n-start', target: 'n-action', edgeKind: 'then' }],
      journeyFlow: embed,
    });
    expect(doc.nodes.some((n) => n.kind === 'journey')).toBe(false);
    expect(doc.nodes.filter((n) => n.kind === 'start')).toHaveLength(1);
  });
});

describe('Wave 22 — domain issues.items', () => {
  it('buildDomainCatalogBundle includes issues.items[0].ruleId', () => {
    const bundle = buildDomainCatalogBundle({
      status: 'completed',
      overallScore: 80,
      pageCount: 3,
      issues: { criticalCount: 1, seriousCount: 0, issueCount: 1 },
      issueItems: [
        { id: 'i1', severity: 'critical', ruleId: 'color-contrast', title: 'Contrast' },
      ],
    });
    const items = (bundle.issues as { items: Array<{ ruleId: string }> }).items;
    expect(items[0]?.ruleId).toBe('color-contrast');
  });
});

describe('Wave 22 — post-journey context seed + re-resolve', () => {
  it('seeds node outputs and re-resolves quality URL from action text', () => {
    const journey = createMinimalAudionJourneyFlow('https://start.test');
    let ctx = emptyRunContext();
    ctx = seedJourneyNodeOutputsIntoContext(ctx, journey, [
      { step: 1, action: 'click', target: 'CTA', result: 'https://landed.test/page' },
    ]);
    expect((ctx.outputs['n-action'] as { text?: string } | undefined)?.text).toContain(
      'https://landed.test/page'
    );

    const qualityUrlRaw = "{{ $('n-action').json.text }}";
    const resolved = resolveFlowParamString(ctx, qualityUrlRaw);
    expect(resolved).toContain('https://landed.test/page');

    const chain = resolveRunUrlChain({
      ctx,
      qualityUrlRaw,
      geoUrlRaw: null,
      startUrl: 'https://start.test',
    });
    expect(chain.qualityUrl).toContain('https://landed.test/page');
  });

  it('keeps journey catalog when seeding node outputs', () => {
    const journey = createMinimalAudionJourneyFlow('https://start.test');
    let ctx = setContextBundle(emptyRunContext(), 'journey', {
      taskCompleted: true,
      finalUrl: 'https://final.test',
      jobId: 'job-1',
    });
    ctx = seedJourneyNodeOutputsIntoContext(ctx, journey, [
      { step: 1, result: 'found menu' },
      { step: 2, result: 'clicked buy' },
    ]);
    expect(Object.keys(ctx.outputs).length).toBeGreaterThan(1);
    expect(ctx.outputs.journey).toMatchObject({ jobId: 'job-1' });
  });
});
