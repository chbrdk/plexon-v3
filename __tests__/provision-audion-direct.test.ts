import { describe, expect, it, vi, beforeEach } from 'vitest';
import { provisionAudionDirect } from '@/lib/assistant/workflows/provision-audion-direct';

vi.mock('@/lib/integrations/audion-project-client', () => ({
  createAudionProject: vi.fn(),
}));

vi.mock('@/lib/db/platform-project-bindings', () => ({
  ensureBindingPlaceholders: vi.fn().mockResolvedValue(undefined),
  upsertPlatformProjectBinding: vi.fn().mockResolvedValue(undefined),
}));

import { createAudionProject } from '@/lib/integrations/audion-project-client';
import { upsertPlatformProjectBinding } from '@/lib/db/platform-project-bindings';

describe('provisionAudionDirect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates audion project and binds to platform project', async () => {
    vi.mocked(createAudionProject).mockResolvedValue({ ok: true, id: 'a1', name: 'Acme' });

    const result = await provisionAudionDirect({
      projectName: 'Acme',
      platformProjectId: 'pp-1',
    });

    expect(result).toEqual({ ok: true, audionProjectId: 'a1', bound: true });
    expect(upsertPlatformProjectBinding).toHaveBeenCalledWith(
      expect.objectContaining({ platformProjectId: 'pp-1', externalProjectId: 'a1', productId: 'audion' })
    );
  });

  it('returns error when audion create fails', async () => {
    vi.mocked(createAudionProject).mockResolvedValue({ ok: false, error: 'AUDION_API_TOKEN fehlt' });

    const result = await provisionAudionDirect({ projectName: 'Acme' });

    expect(result).toEqual({ ok: false, error: 'AUDION_API_TOKEN fehlt' });
  });
});
