/**
 * Wave 23 — EQC as Collection Flow unit tests.
 */

import { describe, expect, it, afterEach } from 'vitest';
import {
  COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
  createEqcQualityTemplate,
  documentHasEqcSpine,
} from '@/lib/collection-test-flow';
import {
  buildBriefCatalogBundle,
  buildCompetitorsCatalogBundle,
  buildQueriesCatalogBundle,
  buildPersonaCatalogBundle,
} from '@/lib/collection-flow-run-context';
import { isEqcFlowRuntimeEnabled } from '@/lib/collection-flow-eqc-execute';
import {
  eventQuickCheckResultFromFlowLastRun,
  mergeFlowContextIntoQuickResult,
} from '@/lib/assistant/reports/event-quick-check-from-flow-context';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';

describe('Wave 23 EQC flow template', () => {
  it('creates eqc-quality-v1 spine with brief confirm and geo confirm', () => {
    const doc = createEqcQualityTemplate('https://example.com', { maxPages: 50 });
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_EQC_QUALITY);
    expect(documentHasEqcSpine(doc)).toBe(true);
    const kinds = doc.nodes.map((n) => n.kind);
    expect(kinds).toContain('research_brief');
    expect(kinds).toContain('human_confirm');
    expect(kinds).toContain('domain_scan');
    expect(kinds).toContain('persona_bootstrap');
    expect(kinds).toContain('suggest_queries');
    expect(kinds).toContain('geo_job');
    expect(kinds).not.toContain('competitors_suggest');
    const briefConfirm = doc.nodes.find(
      (n) => n.kind === 'human_confirm' && n.confirmKind === 'brief'
    );
    const geoConfirm = doc.nodes.find(
      (n) => n.kind === 'human_confirm' && n.confirmKind === 'geo_queries'
    );
    expect(briefConfirm).toBeTruthy();
    expect(geoConfirm).toBeTruthy();
  });

  it('includes competitors spine for complete depth', () => {
    const doc = createEqcQualityTemplate('https://acme.test', {
      maxPages: 1000,
      includeCompetitors: true,
    });
    expect(doc.nodes.some((n) => n.kind === 'competitors_suggest')).toBe(true);
    expect(
      doc.nodes.some((n) => n.kind === 'human_confirm' && n.confirmKind === 'competitors')
    ).toBe(true);
  });
});

describe('Wave 23 catalog bundles', () => {
  it('builds brief / competitors / persona / queries bundles', () => {
    const brief = buildBriefCatalogBundle({
      displayName: 'Acme',
      industry: 'SaaS',
      summary: 'B2B',
      targetAudienceHint: 'Buyers',
      companyContext: 'ctx',
    });
    expect(brief.displayName).toBe('Acme');
    expect(buildCompetitorsCatalogBundle(['a.com', ' b.com ']).items).toEqual([
      'a.com',
      'b.com',
    ]);
    expect(buildPersonaCatalogBundle({ id: 'p1', name: 'Alex', segment: 'Buyer' }).name).toBe(
      'Alex'
    );
    const q = buildQueriesCatalogBundle(['Q1', 'Q2']);
    expect(q.items).toEqual(['Q1', 'Q2']);
    expect(q.text).toBe('Q1\nQ2');
  });
});

describe('Wave 23 EQC_FLOW_RUNTIME flag', () => {
  const prev = process.env.EQC_FLOW_RUNTIME;
  afterEach(() => {
    if (prev === undefined) delete process.env.EQC_FLOW_RUNTIME;
    else process.env.EQC_FLOW_RUNTIME = prev;
  });

  it('defaults on when unset', () => {
    delete process.env.EQC_FLOW_RUNTIME;
    expect(isEqcFlowRuntimeEnabled()).toBe(true);
  });

  it('can be turned off', () => {
    process.env.EQC_FLOW_RUNTIME = '0';
    expect(isEqcFlowRuntimeEnabled()).toBe(false);
    process.env.EQC_FLOW_RUNTIME = 'false';
    expect(isEqcFlowRuntimeEnabled()).toBe(false);
  });

  it('accepts explicit on', () => {
    process.env.EQC_FLOW_RUNTIME = '1';
    expect(isEqcFlowRuntimeEnabled()).toBe(true);
  });
});

describe('Wave 23 report adapter from flow context', () => {
  it('hydrates magazine fields from lastRun.context', () => {
    const result = eventQuickCheckResultFromFlowLastRun({
      projectName: 'Acme',
      platformProjectId: 'pp-1',
      lastRun: {
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:10:00.000Z',
        scanId: null,
        domainScanId: 'scan-1',
        geoJobId: 'geo-1',
        url: 'https://acme.test',
        status: 'complete',
        overallScore: 82,
        citedShare: 40,
        geoFitness: 70,
        context: {
          outputs: {
            brief: {
              displayName: 'Acme GmbH',
              industry: 'SaaS',
              summary: 'Summary',
            },
            domain: { overallScore: 82, status: 'completed', pageCount: 12 },
            persona: { id: 'p1', name: 'Alex', segment: 'Buyer' },
            queries: { items: ['Was ist Acme?', 'Acme Preis'], text: 'Was ist Acme?\nAcme Preis' },
            geo: { overallScore: 75, status: 'completed', geoFitness: 70 },
          },
        },
      },
    });
    expect(result.companyBrief?.displayName).toBe('Acme GmbH');
    expect(result.domainScan?.score).toBe(82);
    expect(result.domainScan?.id).toBe('scan-1');
    expect(result.geoJob?.jobId).toBe('geo-1');
    expect(result.geoQuestions).toEqual(['Was ist Acme?', 'Acme Preis']);
    expect(result.personaPreview?.persona?.name).toBe('Alex');
  });

  it('mergeFlowContextIntoQuickResult fills gaps', () => {
    const base: EventQuickCheckResult = {
      ok: true,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName: 'X',
      url: 'https://x.test',
      outcomes: [],
      steps: [],
      eqcFlowState: {
        flowId: 'f1',
        historyRunId: 'h1',
        context: {
          outputs: {
            brief: { displayName: 'FromCtx' },
            domain: { overallScore: 91 },
          },
        },
      },
    };
    const merged = mergeFlowContextIntoQuickResult(base);
    expect(merged.companyBrief?.displayName).toBe('FromCtx');
    expect(merged.domainScan?.score).toBe(91);
  });
});

describe('Wave 23 human_confirm pause shape', () => {
  it('awaiting fields are present on template confirm nodes', () => {
    const doc = createEqcQualityTemplate('https://example.com');
    const confirms = doc.nodes.filter((n) => n.kind === 'human_confirm');
    expect(confirms.every((n) => n.confirmKind)).toBe(true);
  });
});
