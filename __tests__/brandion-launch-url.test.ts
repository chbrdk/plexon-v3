import { describe, expect, it } from 'vitest';
import {
  BRANDION_LAUNCH_QUERY,
  buildBrandionProjectLaunchUrl,
} from '@/lib/brandion-launch-url';

describe('buildBrandionProjectLaunchUrl', () => {
  it('builds /projects?platformProjectId= for Collection context', () => {
    const href = buildBrandionProjectLaunchUrl('https://brandion-v3.example', {
      platformProjectId: 'pp-1',
    });
    expect(href).toBe(
      `https://brandion-v3.example/projects?${BRANDION_LAUNCH_QUERY.PLATFORM_PROJECT_ID}=pp-1`
    );
    expect(href).not.toContain('platformProjectHint');
  });

  it('omits query when platform project id is empty', () => {
    expect(buildBrandionProjectLaunchUrl('https://brandion-v3.example/', { platformProjectId: null })).toBe(
      'https://brandion-v3.example/projects'
    );
  });
});
