import { describe, expect, it, vi, beforeEach } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { buildProductCreatedLayout } from '@/lib/assistant/ui-blocks/build-product-created-ui';
import { buildScanResultLayout } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import { buildPlatformCreatedLayout } from '@/lib/assistant/ui-blocks/build-platform-created-ui';
import { buildPlaybookReportLayout } from '@/lib/assistant/ui-blocks/build-playbook-report-ui';
import { buildLaunchReadinessLayout } from '@/lib/assistant/ui-blocks/build-launch-readiness-ui';
import { buildDomainScanLayout } from '@/lib/assistant/ui-blocks/build-domain-scan-ui';
import { buildGeoEeatLayout } from '@/lib/assistant/ui-blocks/build-geo-ui';
import type { PlaybookRunResult } from '@/lib/assistant/playbooks/runner';
import type { LaunchReadinessResult } from '@/lib/assistant/playbooks/run-launch-readiness';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  startCheckionDomainScanV3: vi.fn(),
  pollCheckionDomainScanV3: vi.fn(),
  fetchCheckionDomainScanV3Preview: vi.fn(),
}));

vi.mock('@/lib/integrations/checkion-geo-jobs-v3-client', () => ({
  startCheckionGeoJobV3: vi.fn(),
  pollCheckionGeoJobV3: vi.fn(),
}));

vi.mock('@/lib/assistant/auto-assign-checkion', () => ({
  tryAutoAssignCheckionResource: vi.fn().mockResolvedValue({ assigned: true }),
}));

import {
  fetchCheckionDomainScanV3Preview,
  pollCheckionDomainScanV3,
  startCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { pollCheckionGeoJobV3, startCheckionGeoJobV3 } from '@/lib/integrations/checkion-geo-jobs-v3-client';

describe('assistant workflow ui smoke', () => {
  it('product created layout has blocks', () => {
    const layout = buildProductCreatedLayout({
      product: 'checkion',
      name: 'Test',
      projectId: 'id-1',
    });
    expect(layout.blocks.length).toBeGreaterThan(0);
  });

  it('scan layout has metric_grid', () => {
    const layout = buildScanResultLayout({
      id: 's1',
      url: 'https://x.com',
      score: 90,
      stats: { errors: 0, warnings: 1, notices: 0, total: 1 },
      issues: [],
    });
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
  });

  it('platform created layout includes summary', () => {
    const layout = buildPlatformCreatedLayout(
      {
        ok: true,
        platformProjectId: 'pp-1',
        syncResults: [
          { productId: 'checkion', ok: true, externalProjectId: 'c1' },
          { productId: 'audion', ok: false, error: 'token' },
        ],
      },
      'Demo'
    );
    expect(layout.blocks.some((b) => b.type === 'summary_card')).toBe(true);
  });

  it('playbook report layout has audit blocks', () => {
    const result: PlaybookRunResult = {
      ok: true,
      playbookId: 'website_audit',
      playbookLabel: 'Website-Audit',
      url: 'https://example.com',
      steps: [],
      outcomes: [
        {
          stepId: 'pagespeed',
          kind: 'pagespeed_check',
          label: 'PageSpeed',
          status: 'done',
          payload: {
            kind: 'pagespeed_check',
            data: {
              url: 'https://example.com',
              performance: 80,
              accessibility: 85,
              bestPractices: 70,
              seo: 90,
            },
          },
        },
      ],
    };
    const layout = buildPlaybookReportLayout(result);
    expect(layout.blocks.length).toBeGreaterThan(0);
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'data_table')).toBe(true);
  });
});

describe('e2e assistant smoke — Phase 2 intents', () => {
  it('routes website audit playbook intent', () => {
    const intent = routeAssistantIntent('Website audit https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('website_audit');
    }
  });

  it('routes domain scan intent', () => {
    expect(routeAssistantIntent('Deep scan https://example.com').type).toBe('domain_scan');
  });

  it('routes geo analysis intent', () => {
    const intent = routeAssistantIntent('GEO Analyse https://example.com');
    expect(intent.type).toBe('geo_analysis');
  });
});

describe('e2e assistant smoke — domain_scan pipeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('workflow poll + domain scan UI layout', async () => {
    vi.mocked(startCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'dom-smoke',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'queued',
        overallScore: null,
      },
    });
    vi.mocked(pollCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'dom-smoke',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 91,
        pageCount: 8,
      },
    });
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'dom-smoke',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        totalPages: 8,
        score: 91,
        stats: { errors: 0, warnings: 2, notices: 0, total: 2 },
        topIssues: [],
      },
    });

    const workflow = await runDomainScanWorkflow({ url: 'https://example.com', checkionProjectId: 'chk-1' });
    expect(workflow.ok).toBe(true);
    const layout = buildDomainScanLayout(workflow.scan!);
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'link_list')).toBe(true);
  });
});

describe('e2e assistant smoke — geo poll pipeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('workflow geo poll + GEO UI layout', async () => {
    vi.mocked(startCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-smoke',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'queued',
        overallScore: null,
        citedShare: null,
        geoFitness: null,
      },
    });
    vi.mocked(pollCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-smoke',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 73,
        citedShare: 50,
        geoFitness: 70,
      },
      signals: { citedShare: 50, geoFitness: 70 },
      preview: {
        jobId: 'geo-smoke',
        url: 'https://example.com',
        status: 'complete',
        overallScore: 73,
        competitors: [{ name: 'Rival', score: 65 }],
      },
    });

    const workflow = await runGeoAnalysisWorkflow({
      url: 'https://example.com',
      checkionProjectId: 'chk-1',
    });
    expect(workflow.ok).toBe(true);
    expect(pollCheckionGeoJobV3).toHaveBeenCalled();

    const layout = buildGeoEeatLayout(workflow.job!);
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'data_table' || b.type === 'chart')).toBe(true);
  });
});

describe('e2e assistant smoke — launch readiness UI', () => {
  it('launch readiness ampel layout', () => {
    const result: LaunchReadinessResult = {
      ok: true,
      playbookId: 'launch_readiness',
      playbookLabel: 'Launch Readiness',
      projectName: 'Acme',
      url: 'https://example.com',
      platformProjectId: 'pp-1',
      steps: [],
      outcomes: [
        {
          stepId: 'audit_pagespeed',
          label: 'PageSpeed',
          status: 'done',
          payload: {
            kind: 'pagespeed_check',
            data: {
              url: 'https://example.com',
              performance: 82,
              accessibility: 88,
              bestPractices: 75,
              seo: 80,
            },
          },
        },
      ],
    };
    const layout = buildLaunchReadinessLayout(result);
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'data_table')).toBe(true);
  });
});
