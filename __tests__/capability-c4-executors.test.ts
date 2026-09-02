import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeCheckionDomainScanCapability } from '@/lib/capabilities/executors/checkion-domain-scan';
import { executeCheckionGeoJobCapability } from '@/lib/capabilities/executors/checkion-geo-job';
import { executeAudionPersonaBootstrapCapability } from '@/lib/capabilities/executors/audion-persona-bootstrap';
import { executeAudionJourneySegmentCapability } from '@/lib/capabilities/executors/audion-journey-segment';
import { ENV_CAPABILITY_CATALOG_RUNTIME } from '@/lib/capabilities/runtime-flag';
import {
  capabilityIdFromAgentIntent,
  capabilityIdFromFlowNodeKind,
  getCapability,
} from '@/lib/capabilities';
import { resolveCatalogPath, setContextBundle, emptyRunContext } from '@/lib/collection-flow-run-context';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis';
import {
  fetchCheckionDomainScanV3Preview,
  pollCheckionDomainScanV3,
  runCheckionDomainScanV3,
  startCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import { runCheckionGeoJobV3 } from '@/lib/integrations/checkion-geo-jobs-v3-client';
import { runPersonaBootstrap } from '@/lib/integrations/audion-persona-bootstrap-client';

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  runCheckionDomainScanV3: vi.fn(),
  fetchCheckionDomainScanV3Preview: vi.fn(),
  startCheckionDomainScanV3: vi.fn(),
  pollCheckionDomainScanV3: vi.fn(),
}));
vi.mock('@/lib/integrations/checkion-geo-jobs-v3-client', () => ({
  runCheckionGeoJobV3: vi.fn(),
  startCheckionGeoJobV3: vi.fn(),
  pollCheckionGeoJobV3: vi.fn(),
}));
vi.mock('@/lib/integrations/audion-persona-bootstrap-client', () => ({
  runPersonaBootstrap: vi.fn(),
}));
vi.mock('@/lib/assistant/auto-assign-checkion', () => ({
  tryAutoAssignCheckionResource: vi.fn().mockResolvedValue({ assigned: false }),
}));
vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn(),
}));

describe('capability C4 executors + adapters', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env[ENV_CAPABILITY_CATALOG_RUNTIME];
  });

  it('maps domain_scan / geo_job / persona_bootstrap / journey intents', () => {
    expect(capabilityIdFromFlowNodeKind('domain_scan')).toBe('checkion.domain_scan');
    expect(capabilityIdFromFlowNodeKind('geo_job')).toBe('checkion.geo_job');
    expect(capabilityIdFromFlowNodeKind('persona_bootstrap')).toBe('audion.persona_bootstrap');
    expect(capabilityIdFromAgentIntent('domain_scan')).toBe('checkion.domain_scan');
    expect(capabilityIdFromAgentIntent('geo_analysis')).toBe('checkion.geo_job');
    expect(capabilityIdFromAgentIntent('persona_bootstrap')).toBe('audion.persona_bootstrap');
    expect(capabilityIdFromAgentIntent('journey_outline')).toBe('audion.journey_segment');
    expect(getCapability('audion.journey_segment')?.surfaces).toEqual({
      agent: true,
      flow: false,
    });
  });

  it('domain_scan capability writes domain.* catalog (flow)', async () => {
    vi.mocked(runCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'ds-1',
        projectId: 'ck-1',
        url: 'https://domain.test',
        status: 'completed',
        overallScore: 71,
        pageCount: 12,
      },
    });

    const result = await executeCheckionDomainScanCapability(
      { url: 'https://domain.test', maxPages: 20 },
      { source: 'flow', checkionProjectId: 'ck-1', platformProjectId: 'pp-1' }
    );

    expect(result.ok).toBe(true);
    expect(result.catalogRoot).toBe('domain');
    const ctx = setContextBundle(emptyRunContext(), 'domain', result.catalogBundle!);
    expect(resolveCatalogPath(ctx, 'domain.overallScore')).toBe(71);
    expect(resolveCatalogPath(ctx, 'domain.url')).toBe('https://domain.test');
    expect(runCheckionDomainScanV3).toHaveBeenCalledWith(
      expect.objectContaining({
        reuseExistingCompleted: true,
      }),
    );
  });

  it('domain_scan capability does not reuse completed scans for agent source', async () => {
    vi.mocked(runCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'ds-agent',
        projectId: 'ck-1',
        url: 'https://domain.test',
        status: 'completed',
        overallScore: 71,
        pageCount: 12,
      },
    });
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'ds-agent',
        domain: 'domain.test',
        url: 'https://domain.test',
        score: 71,
        totalPages: 12,
        status: 'completed',
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        topIssues: [],
      },
    });

    await executeCheckionDomainScanCapability(
      { url: 'https://domain.test' },
      { source: 'agent', checkionProjectId: 'ck-1', platformProjectId: 'pp-1' },
    );

    expect(runCheckionDomainScanV3).toHaveBeenCalledWith(
      expect.objectContaining({
        reuseExistingCompleted: false,
      }),
    );
  });

  it('geo_job capability writes geo.* catalog and signals', async () => {
    vi.mocked(runCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-1',
        projectId: 'ck-1',
        url: 'https://geo.test',
        status: 'completed',
        overallScore: 64,
        citedShare: 0.4,
        geoFitness: 0.55,
      },
      signals: { citedShare: 0.4, geoFitness: 0.55 },
    });

    const result = await executeCheckionGeoJobCapability(
      { url: 'https://geo.test', companyName: 'Acme', queries: ['q1'] },
      { source: 'flow', checkionProjectId: 'ck-1', platformProjectId: 'pp-1' }
    );

    expect(result.ok).toBe(true);
    expect(result.signals).toEqual({ citedShare: 0.4, geoFitness: 0.55 });
    const ctx = setContextBundle(emptyRunContext(), 'geo', result.catalogBundle!);
    expect(resolveCatalogPath(ctx, 'geo.citedShare')).toBe(0.4);
    expect(resolveCatalogPath(ctx, 'geo.geoFitness')).toBe(0.55);
  });

  it('geo_job capability forwards measurement=live', async () => {
    vi.mocked(runCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-live',
        projectId: 'ck-1',
        url: 'https://geo.test',
        status: 'completed',
        overallScore: 50,
        citedShare: 0.2,
        geoFitness: 0.3,
      },
      signals: { citedShare: 0.2, geoFitness: 0.3 },
    });

    await executeCheckionGeoJobCapability(
      { url: 'https://geo.test', measurement: 'live' },
      { source: 'flow', checkionProjectId: 'ck-1', platformProjectId: 'pp-1' }
    );

    expect(runCheckionGeoJobV3).toHaveBeenCalledWith(
      expect.objectContaining({ measurement: 'live', url: 'https://geo.test' })
    );
  });

  it('persona_bootstrap capability writes persona.* catalog', async () => {
    vi.mocked(runPersonaBootstrap).mockResolvedValue({
      ok: true,
      preview: {
        projectId: 'aud-1',
        projectName: 'Acme',
        targetGroupId: 'tg1',
        targetGroupName: 'Buyers',
        personas: [
          { id: 'p1', name: 'Alex', segment: 'B2B', confidence: 0.8, headline: 'Buyer' },
        ],
        targetGroups: [{ id: 'tg1', name: 'Buyers', segment: 'B2B' }],
      },
    });

    const result = await executeAudionPersonaBootstrapCapability(
      { name: 'Acme', targetGroupName: 'Buyers' },
      { source: 'agent', audionProjectId: 'aud-1' }
    );

    expect(result.ok).toBe(true);
    expect(result.catalogRoot).toBe('persona');
    const ctx = setContextBundle(emptyRunContext(), 'persona', result.catalogBundle!);
    expect(resolveCatalogPath(ctx, 'persona.name')).toBe('Alex');
    expect(result.catalogBundle?.count).toBe(1);
  });

  it('journey_segment capability returns guidance (not a second runner)', async () => {
    const result = await executeAudionJourneySegmentCapability({}, { source: 'agent' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Collection Flow|journey/i);
  });

  it('domain workflow uses capability when flag on', async () => {
    process.env[ENV_CAPABILITY_CATALOG_RUNTIME] = '1';
    vi.mocked(runCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'ds-cap',
        projectId: 'ck-9',
        url: 'https://cap.domain',
        status: 'completed',
        overallScore: 80,
        pageCount: 3,
      },
    });
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'ds-cap',
        domain: 'cap.domain',
        url: 'https://cap.domain',
        score: 80,
        totalPages: 3,
        status: 'completed',
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        topIssues: [],
      },
    });

    const out = await runDomainScanWorkflow({
      url: 'https://cap.domain',
      checkionProjectId: 'ck-9',
    });
    expect(out.ok).toBe(true);
    expect(out.scanId).toBe('ds-cap');
    expect(runCheckionDomainScanV3).toHaveBeenCalledOnce();
  });

  it('geo workflow uses capability when flag on', async () => {
    process.env[ENV_CAPABILITY_CATALOG_RUNTIME] = '1';
    vi.mocked(runCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-cap',
        projectId: 'ck-9',
        url: 'https://cap.geo',
        status: 'completed',
        overallScore: 50,
        citedShare: 0.2,
        geoFitness: 0.3,
      },
      signals: { citedShare: 0.2, geoFitness: 0.3 },
      preview: {
        jobId: 'geo-cap',
        url: 'https://cap.geo',
        status: 'completed',
        overallScore: 50,
        geoFitnessScore: 0.3,
      },
    });

    const out = await runGeoAnalysisWorkflow({
      url: 'https://cap.geo',
      checkionProjectId: 'ck-9',
    });
    expect(out.ok).toBe(true);
    expect(out.jobId).toBe('geo-cap');
    expect(runCheckionGeoJobV3).toHaveBeenCalledOnce();
  });

  it('domain workflow stays on legacy path when flag off', async () => {
    vi.mocked(startCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'legacy-ds',
        projectId: 'ck-1',
        url: 'https://legacy.domain',
        status: 'running',
        overallScore: null,
        pageCount: 0,
      },
    });
    vi.mocked(pollCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'legacy-ds',
        projectId: 'ck-1',
        url: 'https://legacy.domain',
        status: 'completed',
        overallScore: 66,
        pageCount: 2,
      },
    });
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'legacy-ds',
        domain: 'legacy.domain',
        url: 'https://legacy.domain',
        score: 66,
        totalPages: 2,
        status: 'completed',
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        topIssues: [],
      },
    });

    const out = await runDomainScanWorkflow({
      url: 'https://legacy.domain',
      checkionProjectId: 'ck-1',
    });
    expect(out.ok).toBe(true);
    expect(out.scanId).toBe('legacy-ds');
    expect(runCheckionDomainScanV3).not.toHaveBeenCalled();
    expect(startCheckionDomainScanV3).toHaveBeenCalledOnce();
  });
});
