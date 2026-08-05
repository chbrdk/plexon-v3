import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import {
  createCollectionFlowRun,
} from '@/lib/db/collection-flow-runs';
import { enqueueCollectionFlowRun } from '@/lib/collection-flow-run-worker';
import { issueWebhookSecret } from '@/lib/collection-flow-webhook';
import { createPageQualityTemplate, COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY } from '@/lib/collection-test-flow';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';

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
  };
});

vi.mock('@/lib/collection-flow-run-worker', () => ({
  enqueueCollectionFlowRun: vi.fn(),
  processCollectionFlowRun: vi.fn(),
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

describe('collection flow webhook trigger API', () => {
  const issued = issueWebhookSecret();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'svc-secret');
    vi.mocked(getPlatformProjectById).mockResolvedValue(project() as never);
  });

  it('returns 401 without webhook secret', async () => {
    vi.mocked(getCollectionTestFlow).mockResolvedValue({
      id: 'flow-1',
      platformProjectId: 'pp-1',
      name: 'Page quality',
      flow: createPageQualityTemplate('https://acme.test/') as unknown as Record<string, unknown>,
      ownerId: 'user-1',
      templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
      webhookEnabled: true,
      webhookSecretHash: issued.hash,
      webhookSecretHint: issued.hint,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/triggers/webhook/route'
    );
    const res = await POST(new Request('http://localhost/api', { method: 'POST', body: '{}' }), {
      params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 202 and enqueues run with valid secret', async () => {
    const at = new Date();
    vi.mocked(getCollectionTestFlow).mockResolvedValue({
      id: 'flow-1',
      platformProjectId: 'pp-1',
      name: 'Page quality',
      flow: createPageQualityTemplate('https://acme.test/') as unknown as Record<string, unknown>,
      ownerId: 'user-1',
      templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
      webhookEnabled: true,
      webhookSecretHash: issued.hash,
      webhookSecretHint: issued.hint,
      createdAt: at,
      updatedAt: at,
    } as never);

    vi.mocked(createCollectionFlowRun).mockResolvedValue({
      id: 'run-1',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'queued',
      trigger: 'webhook',
      request: {},
      verdict: null,
      lastRun: null,
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    } as never);

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/triggers/webhook/route'
    );
    const res = await POST(
      new Request('http://localhost/api', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${issued.secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: 'https://acme.test/x' }),
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }) }
    );
    expect(res.status).toBe(202);
    const json = (await res.json()) as { runId: string; statusUrl: string };
    expect(json.runId).toBe('run-1');
    expect(json.statusUrl).toContain('/runs/run-1');
    expect(enqueueCollectionFlowRun).toHaveBeenCalledWith({
      platformProjectId: 'pp-1',
      flowId: 'flow-1',
      runId: 'run-1',
    });
  });

  it('service trigger requires contract header', async () => {
    vi.mocked(getCollectionTestFlow).mockResolvedValue({
      id: 'flow-1',
      platformProjectId: 'pp-1',
      name: 'Page quality',
      flow: createPageQualityTemplate('https://acme.test/') as unknown as Record<string, unknown>,
      ownerId: 'user-1',
      templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
      webhookEnabled: false,
      webhookSecretHash: null,
      webhookSecretHint: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const { POST } = await import(
      '@/app/api/platform/projects/[platformProjectId]/flows/[flowId]/triggers/service/route'
    );
    const bad = await POST(
      new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'X-Service-Secret': 'svc-secret', 'Content-Type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }) }
    );
    expect(bad.status).toBe(400);

    const at = new Date();
    vi.mocked(createCollectionFlowRun).mockResolvedValue({
      id: 'run-2',
      flowId: 'flow-1',
      platformProjectId: 'pp-1',
      status: 'queued',
      trigger: 'service',
      request: {},
      verdict: null,
      lastRun: null,
      callbackUrl: null,
      callbackStatus: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    } as never);

    const ok = await POST(
      new Request('http://localhost/api', {
        method: 'POST',
        headers: {
          'X-Service-Secret': 'svc-secret',
          'X-Plexon-Contract-Version': PLEXON_FEDERATION_CONTRACT_VERSION,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      { params: Promise.resolve({ platformProjectId: 'pp-1', flowId: 'flow-1' }) }
    );
    expect(ok.status).toBe(202);
  });
});
