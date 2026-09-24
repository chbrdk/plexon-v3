import { beforeEach, describe, expect, it, vi } from 'vitest';
import { healAudionBindingFromProduct } from '@/lib/assistant/workflows/heal-audion-binding';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/db/platform-project-bindings', () => ({
  ensureBindingPlaceholders: vi.fn(),
  upsertPlatformProjectBinding: vi.fn(),
}));

vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchAudionPlatformProjectSummary: vi.fn(),
}));

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  ensureBindingPlaceholders,
  upsertPlatformProjectBinding,
} from '@/lib/db/platform-project-bindings';
import { fetchAudionPlatformProjectSummary } from '@/lib/platform-project-dashboard-fetch';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';

describe('healAudionBindingFromProduct', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts binding when Audion GET returns externalProjectId', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      createdByUserId: 'owner-1',
    } as never);
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'audion-42',
      personaCount: 0,
      targetGroupCount: 0,
      journeyCount: 0,
      studyCount: 0,
      targetGroups: [],
      personas: [],
      journeys: [],
      studies: [],
    });

    const result = await healAudionBindingFromProduct('pp-1', {
      plexonUserId: 'actor-1',
      source: 'test',
    });

    expect(fetchAudionPlatformProjectSummary).toHaveBeenCalledWith('pp-1', 'actor-1');
    expect(ensureBindingPlaceholders).toHaveBeenCalledWith('pp-1');
    expect(upsertPlatformProjectBinding).toHaveBeenCalledWith(
      expect.objectContaining({
        platformProjectId: 'pp-1',
        productId: 'audion',
        externalProjectId: 'audion-42',
        syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
        syncMessage: 'test',
      })
    );
    expect(result).toEqual({ healed: true, audionProjectId: 'audion-42' });
  });

  it('falls back to Collection creator as actor', async () => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      createdByUserId: 'owner-1',
    } as never);
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue(null);

    const result = await healAudionBindingFromProduct('pp-1');

    expect(fetchAudionPlatformProjectSummary).toHaveBeenCalledWith('pp-1', 'owner-1');
    expect(result.healed).toBe(false);
    expect(upsertPlatformProjectBinding).not.toHaveBeenCalled();
  });
});
