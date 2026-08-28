import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/collection-knowledge-pack-auth', () => ({
  isServiceSecretAuthorized: vi.fn(() => true),
  hasValidContractHeader: vi.fn(() => true),
}))

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}))

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getBindingsForPlatformProject: vi.fn(async () => []),
}))

vi.mock('@/lib/platform-project-access', () => ({
  userCanManageCollectionLifecycle: vi.fn(),
}))

vi.mock('@/lib/platform-project-lifecycle', () => ({
  setPlatformProjectLifecycleStatus: vi.fn(),
}))

vi.mock('@/lib/platform-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/platform-contract')>()
  return {
    ...actual,
    platformJson: (body: unknown) => actual.platformJson(body),
  }
})

describe('PATCH /api/platform/provisioning/projects/:id (product lifecycle)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgres://test'
  })

  it('archives via lifecycle when user may manage the Collection', async () => {
    const projects = await import('@/lib/db/platform-projects')
    const access = await import('@/lib/platform-project-access')
    const lifecycle = await import('@/lib/platform-project-lifecycle')
    vi.mocked(projects.getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      name: 'MSQ DX',
      companyId: 'co-1',
      status: 'active',
    } as never)
    vi.mocked(access.userCanManageCollectionLifecycle).mockResolvedValue(true)
    vi.mocked(lifecycle.setPlatformProjectLifecycleStatus).mockResolvedValue({
      project: { id: 'pp-1', status: 'archived' } as never,
      syncResults: [{ platformProjectId: 'pp-1', productId: 'brandion', ok: true }],
    })

    const { PATCH } = await import(
      '@/app/api/platform/provisioning/projects/[platformProjectId]/route'
    )
    const req = new NextRequest('http://plexon.test/api/platform/provisioning/projects/pp-1', {
      method: 'PATCH',
      headers: { 'X-Plexon-User-Id': 'user-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ platformProjectId: 'pp-1' }) })
    expect(res.status).toBe(200)
    expect(lifecycle.setPlatformProjectLifecycleStatus).toHaveBeenCalledWith('pp-1', 'archived', {
      source: 'plexon-provisioning-product-lifecycle',
    })
  })

  it('forbids when user cannot manage the Collection', async () => {
    const projects = await import('@/lib/db/platform-projects')
    const access = await import('@/lib/platform-project-access')
    vi.mocked(projects.getPlatformProjectById).mockResolvedValue({ id: 'pp-1' } as never)
    vi.mocked(access.userCanManageCollectionLifecycle).mockResolvedValue(false)

    const { PATCH } = await import(
      '@/app/api/platform/provisioning/projects/[platformProjectId]/route'
    )
    const req = new NextRequest('http://plexon.test/api/platform/provisioning/projects/pp-1', {
      method: 'PATCH',
      headers: { 'X-Plexon-User-Id': 'user-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ platformProjectId: 'pp-1' }) })
    expect(res.status).toBe(403)
  })
})
