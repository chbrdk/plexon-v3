import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  createCollectionTestFlow,
  getCollectionTestFlow,
  listCollectionTestFlows,
  persistFlowRunResult,
  toCollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import { getRequestUser } from '@/lib/auth-request-user';
import { userCanEditKnowledgePack } from '@/lib/collection-knowledge-pack-auth';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { runCheckionSingleScan, fetchCheckionScanIssues } from '@/lib/integrations/checkion-scans-client';
import { runAudionJourneySegment } from '@/lib/integrations/audion-journey-client';
import {
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
  createJourneyQualityTemplate,
  createPageQualityIssuesTemplate,
  createPageQualityTemplate,
} from '@/lib/collection-test-flow';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/collection-test-flows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/collection-test-flows')>();
  return {
    ...actual,
    listCollectionTestFlows: vi.fn(),
    getCollectionTestFlow: vi.fn(),
    createCollectionTestFlow: vi.fn(),
    persistFlowRunResult: vi.fn(),
    patchCollectionTestFlow: vi.fn(),
  };
});

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getExternalProjectId: vi.fn(),
}));

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
  isAdmin: vi.fn((u: { role?: string } | null) => u?.role === 'admin'),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));

vi.mock('@/lib/collection-knowledge-pack-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collection-knowledge-pack-auth')>();
  return {
    ...actual,
    userCanEditKnowledgePack: vi.fn(),
  };
});

vi.mock('@/lib/integrations/checkion-scans-client', () => ({
  runCheckionSingleScan: vi.fn(),
  fetchCheckionScanIssues: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-journey-client', () => ({
  runAudionJourneySegment: vi.fn(),
}));

function project() {
  return {
    id: 'pp-1',
    companyId: 'co-1',
    name: 'Acme',
    domain: 'acme.test',
    metadata: null,
    status: 'active',
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function flowRow() {
  const flow = createPageQualityTemplate('https://acme.test/');
  const at = new Date('2026-08-05T12:00:00.000Z');
  return {
    id: 'flow-1',
    platformProjectId: 'pp-1',
    name: 'Page quality',
    flow: flow as unknown as Record<string, unknown>,
    ownerId: 'user-1',
    templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    createdAt: at,
    updatedAt: at,
  };
}

function journeyFlowRow() {
  const flow = createJourneyQualityTemplate('https://acme.test/');
  const at = new Date('2026-08-05T12:00:00.000Z');
  return {
    id: 'flow-j1',
    platformProjectId: 'pp-1',
    name: 'Journey + quality',
    flow: flow as unknown as Record<string, unknown>,
    ownerId: 'user-1',
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
    createdAt: at,
    updatedAt: at,
  };
}

describe('Collection Test Flow run API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://plexon.test/db');
    vi.mocked(getPlatformProjectById).mockResolvedValue(project() as never);
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    vi.mocked(userCanEditKnowledgePack).mockResolvedValue(true);
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'user-1',
      email: 'a@test',
      role: 'admin',
      name: null,
    } as never);
    vi.mocked(getExternalProjectId).mockImplementation(async (_id, productId) => {
      if (productId === 'checkion') return 'chk-proj-1';
      if (productId === 'audion') return 'aud-proj-1';
      return null;
    });
    vi.mocked(getCollectionTestFlow).mockResolvedValue(flowRow() as never);
  });

  it('POST run returns collectionReady when Checkion score passes', async () => {
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-1',
        projectId: 'chk-proj-1',
        mode: 'single',
        url: 'https://acme.test/',
        status: 'completed',
        overallScore: 88,
      },
    });
    const saved = {
      ...flowRow(),
      flow: {
        ...createPageQualityTemplate('https://acme.test/'),
        lastVerdict: null,
      } as unknown as Record<string, unknown>,
    };
    vi.mocked(persistFlowRunResult).mockImplementation(async (input) => ({
      ...saved,
      flow: {
        ...createPageQualityTemplate('https://acme.test/'),
        lastVerdict: input.verdict,
        lastRun: input.lastRun,
      } as unknown as Record<string, unknown>,
    }));

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/run/route'
    );
    const res = await POST(new Request('http://local/run', { method: 'POST', body: '{}' }), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      verdict: { collectionReady: boolean; qualityPassed: boolean; overallScore: number };
      nodeStates: Record<string, string>;
    };
    expect(body.verdict.collectionReady).toBe(true);
    expect(body.verdict.qualityPassed).toBe(true);
    expect(body.verdict.overallScore).toBe(88);
    expect(body.nodeStates['n-ok']).toBe('done');
    expect(runCheckionSingleScan).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'chk-proj-1',
        url: 'https://acme.test/',
        platformProjectId: 'pp-1',
      })
    );
    expect(runAudionJourneySegment).not.toHaveBeenCalled();
  });

  it('POST journey-quality run correlates audionRunId and finalUrl into scan', async () => {
    vi.mocked(getCollectionTestFlow).mockResolvedValue(journeyFlowRow() as never);
    vi.mocked(runAudionJourneySegment).mockResolvedValue({
      ok: true,
      studyId: 'study-1',
      waveId: 'wave-1',
      jobId: 'job-abc',
      job: {
        jobId: 'job-abc',
        status: 'complete',
        finalUrl: 'https://acme.test/explored',
        success: true,
        taskCompleted: true,
        validEvidence: true,
      },
    });
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-2',
        projectId: 'chk-proj-1',
        mode: 'single',
        url: 'https://acme.test/explored',
        status: 'completed',
        overallScore: 91,
      },
    });
    vi.mocked(persistFlowRunResult).mockImplementation(async (input) => ({
      ...journeyFlowRow(),
      flow: {
        ...createJourneyQualityTemplate('https://acme.test/'),
        lastVerdict: input.verdict,
        lastRun: input.lastRun,
      } as unknown as Record<string, unknown>,
    }));

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/run/route'
    );
    const res = await POST(new Request('http://local/run', { method: 'POST', body: '{}' }), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-j1' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      verdict: {
        collectionReady: boolean;
        taskCompleted: boolean;
        hasJourneySegment: boolean;
      };
      lastRun: { audionJobId: string; stepUrl: string; scanId: string };
      nodeStates: Record<string, string>;
    };
    expect(body.verdict.hasJourneySegment).toBe(true);
    expect(body.verdict.taskCompleted).toBe(true);
    expect(body.verdict.collectionReady).toBe(true);
    expect(body.lastRun.audionJobId).toBe('job-abc');
    expect(body.lastRun.stepUrl).toBe('https://acme.test/explored');
    expect(body.lastRun.scanId).toBe('scan-2');
    expect(body.nodeStates['n-journey']).toBe('done');
    expect(runAudionJourneySegment).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'aud-proj-1' })
    );
    expect(runCheckionSingleScan).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'chk-proj-1',
        url: 'https://acme.test/explored',
        platformProjectId: 'pp-1',
        audionRunId: 'job-abc',
        stepUrl: 'https://acme.test/explored',
      })
    );
  });

  it('POST page-quality-issues run fails issue gate on criticals', async () => {
    const row = {
      ...flowRow(),
      id: 'flow-iss',
      name: 'Page quality + issues',
      templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
      flow: createPageQualityIssuesTemplate('https://acme.test/') as unknown as Record<
        string,
        unknown
      >,
    };
    vi.mocked(getCollectionTestFlow).mockResolvedValue(row as never);
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-iss',
        projectId: 'chk-proj-1',
        mode: 'single',
        url: 'https://acme.test/',
        status: 'completed',
        overallScore: 95,
      },
    });
    vi.mocked(fetchCheckionScanIssues).mockResolvedValue({
      ok: true,
      items: [
        { id: 'i1', severity: 'critical', ruleId: 'color-contrast' },
        { id: 'i2', severity: 'minor', ruleId: 'label' },
      ],
      signals: { criticalCount: 1, issueCount: 2, ruleIds: ['color-contrast', 'label'] },
    });
    vi.mocked(persistFlowRunResult).mockImplementation(async (input) => ({
      ...row,
      flow: {
        ...createPageQualityIssuesTemplate('https://acme.test/'),
        lastVerdict: input.verdict,
        lastRun: input.lastRun,
      } as unknown as Record<string, unknown>,
    }));

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/run/route'
    );
    const res = await POST(new Request('http://local/run', { method: 'POST', body: '{}' }), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-iss' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      verdict: {
        scorePassed: boolean;
        issueGatePassed: boolean;
        issueGateBranch: string;
        collectionReady: boolean;
      };
      lastRun: { criticalCount: number; issueGateBranch: string };
      nodeStates: Record<string, string>;
    };
    expect(body.verdict.scorePassed).toBe(true);
    expect(body.verdict.issueGatePassed).toBe(false);
    expect(body.verdict.issueGateBranch).toBe('fail');
    expect(body.verdict.collectionReady).toBe(false);
    expect(body.lastRun.criticalCount).toBe(1);
    expect(body.nodeStates['n-issues']).toBe('done');
    expect(body.nodeStates['n-abandon']).toBe('done');
    expect(fetchCheckionScanIssues).toHaveBeenCalledWith('scan-iss');
  });

  it('POST list/create gallery uses session ACL', async () => {
    vi.mocked(listCollectionTestFlows).mockResolvedValue([flowRow()] as never);
    vi.mocked(createCollectionTestFlow).mockResolvedValue(flowRow() as never);

    const { GET, POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/route'
    );
    const list = await GET(new Request('http://local/flows'), {
      params: Promise.resolve({ platformProjectId: 'pp-1' }),
    });
    expect(list.status).toBe(200);
    const listed = (await list.json()) as { items: unknown[] };
    expect(listed.items).toHaveLength(1);

    const created = await POST(
      new Request('http://local/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Journey + quality',
          templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
        }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1' }) }
    );
    expect(created.status).toBe(201);
    expect(createCollectionTestFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
      })
    );
    const item = toCollectionTestFlowResponse(flowRow() as never);
    expect(item.flow.nodes[0].kind).toBe('start');
  });
});
