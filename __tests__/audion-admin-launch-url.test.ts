import { describe, expect, it } from 'vitest';

import {
  AUDION_LAUNCH_QUERY,
  buildAudionAdminLaunchUrl,
  buildAudionAppUrl,
  buildAudionChatUrl,
  buildAudionJourneyUrl,
  buildAudionPersonaUrl,
  buildAudionStudyUrl,
  buildAudionTargetGroupUrl,
} from '@/lib/audion-admin-launch-url';

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

describe('buildAudionAppUrl helpers', () => {
  const origin = 'https://audion.example';

  it('builds target group, persona, chat, journey, and study deep-links', () => {
    expect(buildAudionTargetGroupUrl(origin, 'tg-1')).toBe('https://audion.example/target-groups/tg-1');
    expect(buildAudionPersonaUrl(origin, 'p-1')).toBe('https://audion.example/personas/p-1');
    expect(buildAudionChatUrl(origin, { personaId: 'p-1', projectId: 'proj-1' })).toBe(
      'https://audion.example/chat?personaId=p-1&projectId=proj-1'
    );
    expect(buildAudionJourneyUrl(origin, 'j-1')).toBe('https://audion.example/journeys/j-1');
    expect(buildAudionStudyUrl(origin, 's-1')).toBe('https://audion.example/studies/s-1');
  });

  it('omits empty query values', () => {
    expect(buildAudionAppUrl(origin, '/chat', { personaId: 'p-1', projectId: '' })).toBe(
      'https://audion.example/chat?personaId=p-1'
    );
  });
});
