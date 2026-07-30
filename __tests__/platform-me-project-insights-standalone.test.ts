import { describe, expect, it } from 'vitest';

import {
  buildStandaloneProductInsightRows,
  isSyntheticInsightPlatformProjectId,
  PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX,
} from '@/lib/platform-me-project-insights-standalone';

describe('platform-me-project-insights-standalone', () => {
  it('marks synthetic ids and skips CHECKION rows already covered by an accessible platform project', () => {
    const rows = buildStandaloneProductInsightRows({
      checkionBase: 'https://checkion.example',
      audionBase: 'https://audion.example/admin',
      accessiblePlatformProjectIds: new Set(['plat-1']),
      checkionRows: [
        {
          id: 'c1',
          name: 'Alpha',
          domain: 'a.com',
          platformProjectId: 'plat-1',
          platformCompanyId: 'co',
          scanCount: 3,
        },
        {
          id: 'c2',
          name: 'Beta',
          domain: null,
          platformProjectId: null,
          platformCompanyId: null,
          scanCount: 0,
        },
      ],
      audionRows: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].platformProject.name).toBe('Beta');
    expect(isSyntheticInsightPlatformProjectId(rows[0].platformProject.id)).toBe(true);
    expect(rows[0].platformProject.id).toBe(`${PLEXON_INSIGHT_SYNTHETIC_PLATFORM_ID_PREFIX}checkion:c2`);
    expect(rows[0].openPlatformProject).toBe(false);
    expect(rows[0].links.checkionProject).toBe('https://checkion.example/projects/c2');
  });

  it('skips AUDION rows when platform_project_id is accessible', () => {
    const rows = buildStandaloneProductInsightRows({
      checkionBase: 'https://checkion.example',
      audionBase: 'https://audion.example/admin',
      accessiblePlatformProjectIds: new Set(['p-aud']),
      checkionRows: [],
      audionRows: [
        {
          id: 'aud-uuid',
          name: 'Aud Z',
          platformProjectId: 'p-aud',
          platformCompanyId: null,
          checkionProjectId: null,
          personaCount: 5,
        },
      ],
    });
    expect(rows).toHaveLength(0);
  });
});
