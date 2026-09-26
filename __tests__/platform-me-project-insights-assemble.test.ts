import { describe, expect, it } from 'vitest';

import { assembleCollectionInsightRows } from '@/lib/platform-me-project-insights-assemble';

describe('assembleCollectionInsightRows', () => {
  it('merges product DB metrics by platformProjectId and falls back to bindings', () => {
    const rows = assembleCollectionInsightRows({
      platformProjects: [
        { id: 'pp1', name: 'A', domain: 'a.test', status: 'active', companyId: 'c1' },
        { id: 'pp2', name: 'B', domain: null, status: 'active', companyId: 'c1' },
      ],
      bindings: [
        { platformProjectId: 'pp1', productId: 'checkion', externalProjectId: 'chk-1' },
        { platformProjectId: 'pp1', productId: 'audion', externalProjectId: 'aud-1' },
        { platformProjectId: 'pp2', productId: 'checkion', externalProjectId: 'chk-2' },
      ],
      checkionRows: [
        {
          id: 'chk-1',
          name: 'A',
          domain: 'a.test',
          platformProjectId: 'pp1',
          platformCompanyId: 'c1',
          scanCount: 4,
        },
      ],
      audionRows: [],
      checkionBase: 'https://checkion.test',
      audionBase: 'https://audion.test',
      brandionBase: 'https://brandion.test',
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].checkion).toEqual({ externalProjectId: 'chk-1', scanCount: 4 });
    expect(rows[0].audion).toEqual({
      externalProjectId: 'aud-1',
      personaCount: 0,
      targetGroupCount: 0,
    });
    expect(rows[1].checkion).toEqual({ externalProjectId: 'chk-2', scanCount: 0 });
    expect(rows[1].audion).toBeNull();
  });
});
