import { describe, expect, it } from 'vitest'
import { buildMagcloudProjectLaunchUrl } from '../lib/magcloud-launch-url'

describe('buildMagcloudProjectLaunchUrl', () => {
  it('appends platformProjectId for bound Collections', () => {
    expect(
      buildMagcloudProjectLaunchUrl('https://magcloud.example/', {
        platformProjectId: 'pp-1',
      }),
    ).toBe('https://magcloud.example/boards?platformProjectId=pp-1')
  })

  it('omits query when unbound', () => {
    expect(buildMagcloudProjectLaunchUrl('https://magcloud.example', {})).toBe(
      'https://magcloud.example/boards',
    )
  })
})
