import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import {
  createCollectionFlowRun,
  getCollectionFlowRun,
  listRecentCollectionFlowRuns,
  patchCollectionFlowRun,
  toCollectionFlowRunResponse,
} from '@/lib/db/collection-flow-runs';
import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import { createPageQualityTemplate, COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY } from '@/lib/collection-test-flow';
import { authorizeKnowledgeRead } from '@/lib/collection-knowledge-pack-auth';
import { apiPlatformProjectFlowRuns } from '@/lib/constants';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/collection-test-flows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/collection-test-flows')>();
  return {
    ...actual,
    getCollectionTestFlow: vi.fn(),
  };
});

vi.mock('@/lib/db/collection-flow-runs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/collection-flow-runs')>();
  return {
    ...actual,
    createCollectionFlowRun: vi.fn(),
    getCollectionFlowRun: vi.fn(),
    listRecentCollectionFlowRuns: vi.fn(),
    patchCollectionFlowRun: vi.fn(),
  };
});

vi.mock('@/lib/collection-flow-execute', () => ({
  executeCollectionFlowRun: vi.fn(),
}));

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(async () => ({ id: 'user-1', role: 'admin', email: 'a@b.c' })),
  isAdmin: vi.fn(() => true),
}));

vi.mock('@/lib/collection-knowledge-pack-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collection-knowledge-pack-auth')>();
  return {
    ...actual,
    userCanEditKnowledgePack: vi.fn(async () => true),
    authorizeKnowledgeRead: vi.fn(async () => ({
      kind: 'session',
      user: { id: 'user-1', role: 'admin', email: 'a@b.c' },
    })),
  };
});

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

function flowRow(at = new Date()) {
  return {
    id: 'flow-1',
    platformProjectId: 'pp-1',
    name: 'Page quality',
    flow: createPageQualityTemplate('https://acme.test/') as unknown as Record<string, unknown>,
    ownerId: 'user-1',
    templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    webhookEnabled: false,
    webhookSecretHash: null,
    webhookSecretHint: null,
    createdAt: at,
    updatedAt: at,
  };
}

describe('collection flow run history (Wave 17)', () => {
  const at = new Date('2026-08-05T12:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.mocked(getPlatformProjectById).mockResolvedValue(project() as never);
    vi.mocked(getCollectionTestFlow).mockResolvedValue(flowRow(at) as never);
  });

  it('exposes apiPlatformProjectFlowRuns helper', () => {
    expect(apiPlatformProjectFlowRuns('pp-1', 'flow-1')).toBe(
      '/api/platform/projects/pp-1/flows/flow-1/runs'
    );
  });

  it('POST …/run creates ui running row then patches complete', async () => {
    vi.mocked(createCollectionFlowRun).mockResolvedValue({
      id: 'run-ui-1',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'running',
      trigger: 'ui',
      request: {},
      verdict: null,
      lastRun: null,
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    } as never);

    const verdict = {
      collectionReady: true,
      taskCompleted: null,
      validEvidence: null,
      qualityOk: true,
      overallScore: 80,
      explanation: 'ok',
    };
    const lastRun = { status: 'complete' as const, overallScore: 80 };

    vi.mocked(executeCollectionFlowRun).mockResolvedValue({
      ok: true,
      flow: { ...flowRow(at), flow: { ...createPageQualityTemplate('https://acme.test/'), lastVerdict: verdict, lastRun } },
      verdict: verdict as never,
      lastRun: lastRun as never,
      nodeStates: {},
    } as never);

    vi.mocked(patchCollectionFlowRun).mockResolvedValue({
      id: 'run-ui-1',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'complete',
      trigger: 'ui',
      request: {},
      verdict,
      lastRun,
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    } as never);

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/run/route'
    );
    const res = await POST(
      new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }) }
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { historyRunId?: string };
    expect(json.historyRunId).toBe('run-ui-1');
    expect(createCollectionFlowRun).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'ui', status: 'running' })
    );
    expect(patchCollectionFlowRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-ui-1',
        status: 'complete',
        verdict,
        lastRun,
      })
    );
  });

  it('GET …/runs returns newest-first items', async () => {
    const newer = {
      id: 'run-2',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'complete' as const,
      trigger: 'ui' as const,
      request: null,
      verdict: null,
      lastRun: null,
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: new Date('2026-08-05T13:00:00.000Z'),
      updatedAt: new Date('2026-08-05T13:00:00.000Z'),
    };
    const older = {
      ...newer,
      id: 'run-1',
      trigger: 'webhook' as const,
      createdAt: at,
      updatedAt: at,
    };
    vi.mocked(listRecentCollectionFlowRuns).mockResolvedValue([newer, older] as never);
    vi.mocked(authorizeKnowledgeRead).mockResolvedValue({
      kind: 'session',
      user: { id: 'user-1', role: 'admin', email: 'a@b.c' },
    } as never);

    const { GET } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/runs/route'
    );
    const res = await GET(new Request('http://localhost/api?limit=30'), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ id: string; trigger: string }> };
    expect(json.items.map((i) => i.id)).toEqual(['run-2', 'run-1']);
    expect(json.items[0]?.trigger).toBe('ui');
    expect(listRecentCollectionFlowRuns).toHaveBeenCalledWith('pp-1', 'flow-1', 30);
  });

  it('GET …/runs/:runId returns one run', async () => {
    const row = {
      id: 'run-1',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'complete' as const,
      trigger: 'ui' as const,
      request: null,
      verdict: { collectionReady: true },
      lastRun: { status: 'complete', overallScore: 72 },
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    };
    vi.mocked(getCollectionFlowRun).mockResolvedValue(row as never);

    const { GET } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/runs/[runId]/route'
    );
    const res = await GET(new Request('http://localhost/api'), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1', runId: 'run-1' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as ReturnType<typeof toCollectionFlowRunResponse>;
    expect(json.id).toBe('run-1');
    expect(json.trigger).toBe('ui');
    expect(json.status).toBe('complete');
  });
});
