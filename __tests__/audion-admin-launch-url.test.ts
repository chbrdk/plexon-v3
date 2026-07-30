import { describe, expect, it } from 'vitest';

import { AUDION_LAUNCH_QUERY, buildAudionAdminLaunchUrl } from '@/lib/audion-admin-launch-url';

describe('buildAudionAdminLaunchUrl', () => {
  it('adds project hint and company id', () => {
    const u = buildAudionAdminLaunchUrl('https://audion.example/admin', {
      platformProjectHint: 'pp-1',
      platformCompanyId: 'co-2',
    });
    expect(u).toBe(
      `https://audion.example/admin/?${AUDION_LAUNCH_QUERY.PLATFORM_PROJECT_HINT}=pp-1&${AUDION_LAUNCH_QUERY.PLATFORM_COMPANY_ID}=co-2`
    );
  });

  it('omits empty optional parts', () => {
    expect(buildAudionAdminLaunchUrl('https://a.test/admin', { platformCompanyId: 'x' })).toBe(
      `https://a.test/admin/?${AUDION_LAUNCH_QUERY.PLATFORM_COMPANY_ID}=x`
    );
    expect(buildAudionAdminLaunchUrl('https://a.test/admin', {})).toBe('https://a.test/admin/');
  });
});
