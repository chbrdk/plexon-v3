import { describe, expect, it } from 'vitest';

import {
  appendFederationParams,
  buildFederatedLaunchHref,
  PLEXON_ENTRY_POINT_PARAM,
  PLEXON_PLATFORM_ROLE_PARAM,
  PLEXON_RETURN_TO_PARAM,
  PLEXON_SOURCE_PARAM,
  PLEXON_SOURCE_VALUE,
} from '@/lib/federation-links';

describe('PLEXON federation links', () => {
  it('appends source and return target to absolute product URLs', () => {
    const href = appendFederationParams('https://checkion.example.com/settings', {
      returnTo: 'https://plexon.example.com/products',
    });
    const url = new URL(href);
    expect(url.searchParams.get(PLEXON_SOURCE_PARAM)).toBe(PLEXON_SOURCE_VALUE);
    expect(url.searchParams.get(PLEXON_RETURN_TO_PARAM)).toBe('https://plexon.example.com/products');
  });

  it('preserves relative URLs for internal usage', () => {
    expect(appendFederationParams('/products')).toBe(`/products?${PLEXON_SOURCE_PARAM}=${PLEXON_SOURCE_VALUE}`);
  });

  it('adds launch context for federated product entry points', () => {
    const href = buildFederatedLaunchHref('https://checkion.example.com/scan', {
      productHomeUrl: 'https://checkion.example.com/',
      returnTo: 'https://plexon.example.com/products',
      launchContext: {
        entryPointId: 'checkion-scan',
        projectId: 'project-1',
        platformRole: 'manager',
      },
    });
    const url = new URL(href);
    expect(url.searchParams.get(PLEXON_ENTRY_POINT_PARAM)).toBe('checkion-scan');
    expect(url.searchParams.get(PLEXON_PLATFORM_ROLE_PARAM)).toBe('manager');
    expect(url.searchParams.get('projectId')).toBe('project-1');
  });
});
