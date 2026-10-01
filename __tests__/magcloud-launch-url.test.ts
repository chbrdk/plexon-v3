import { describe, expect, it } from 'vitest'
import { buildMagcloudProjectLaunchUrl } from '../lib/magcloud-launch-url'

describe('buildMagcloudProjectLaunchUrl', () => {
  it('launches Collection workspace for bound Collections', () => {
    expect(
      buildMagcloudProjectLaunchUrl('https://magcloud.example/', {
        platformProjectId: 'pp-1',
      }),
    ).toBe('https://magcloud.example/projects/pp-1')
  })

  it('falls back to /projects when unbound', () => {
    expect(buildMagcloudProjectLaunchUrl('https://magcloud.example', {})).toBe(
      'https://magcloud.example/projects',
    )
  })
})
