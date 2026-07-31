import { describe, expect, it } from 'vitest';
import {
  resolveAudionCapability,
  resolveCheckionCapability,
} from '@/lib/platform-project-capability-summary';

describe('platform-project-capability-summary', () => {
  it('prefers live summary over binding', () => {
    const audion = resolveAudionCapability(
      {
        externalProjectId: 'live-1',
        personaCount: 4,
        targetGroupCount: 1,
        journeyCount: 0,
        studyCount: 0,
        targetGroups: [],
        personas: [],
        journeys: [],
        studies: [],
      },
      [{ productId: 'audion', externalProjectId: 'bind-1', syncStatus: 'in_sync' }]
    );
    expect(audion).toEqual({
      externalProjectId: 'live-1',
      personaCount: 4,
      targetGroupCount: 1,
      journeyCount: 0,
      studyCount: 0,
      targetGroups: [],
      personas: [],
      journeys: [],
      studies: [],
    });
  });

  it('falls back to binding when live summary is missing', () => {
    const audion = resolveAudionCapability(null, [
      { productId: 'audion', externalProjectId: 'proj-test3', syncStatus: 'in_sync' },
    ]);
    expect(audion).toEqual({
      externalProjectId: 'proj-test3',
      personaCount: 0,
      targetGroupCount: 0,
      journeyCount: 0,
      studyCount: 0,
      targetGroups: [],
      personas: [],
      journeys: [],
      studies: [],
    });

    const checkionEmpty = resolveCheckionCapability(null, [
      { productId: 'checkion', externalProjectId: null, syncStatus: 'failed' },
    ]);
    expect(checkionEmpty).toBeNull();

    const checkionBound = resolveCheckionCapability(null, [
      { productId: 'checkion', externalProjectId: 'chk-1', syncStatus: 'in_sync' },
    ]);
    expect(checkionBound).toEqual({
      externalProjectId: 'chk-1',
      scanCount: 0,
      domainScanCount: 0,
      standaloneScanCount: 0,
      domainScans: [],
      standaloneScans: [],
    });
  });
});
