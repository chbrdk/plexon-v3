import { describe, expect, it } from 'vitest';
import {
  resolveAudionCapability,
  resolveCheckionCapability,
} from '@/lib/platform-project-capability-summary';

describe('platform-project-capability-summary', () => {
  it('prefers live summary over binding', () => {
    const audion = resolveAudionCapability(
      { externalProjectId: 'live-1', personaCount: 4 },
      [{ productId: 'audion', externalProjectId: 'bind-1', syncStatus: 'in_sync' }]
    );
    expect(audion).toEqual({ externalProjectId: 'live-1', personaCount: 4 });
  });

  it('falls back to binding when live summary is missing', () => {
    const audion = resolveAudionCapability(null, [
      { productId: 'audion', externalProjectId: 'proj-test3', syncStatus: 'in_sync' },
    ]);
    expect(audion).toEqual({ externalProjectId: 'proj-test3', personaCount: 0 });

    const checkion = resolveCheckionCapability(null, [
      { productId: 'checkion', externalProjectId: null, syncStatus: 'failed' },
    ]);
    expect(checkion).toBeNull();
  });
});
