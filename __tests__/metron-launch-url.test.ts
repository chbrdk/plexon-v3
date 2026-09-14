import { describe, expect, it } from 'vitest'
import { buildMetronProjectLaunchUrl } from '../lib/metron-launch-url'

describe('buildMetronProjectLaunchUrl', () => {
  it('appends platformProjectId for bound Collections', () => {
    expect(
      buildMetronProjectLaunchUrl('https://metron.example/', {
        platformProjectId: 'pp-1',
      }),
    ).toBe('https://metron.example/projects?platformProjectId=pp-1')
  })

  it('omits query when unbound', () => {
    expect(buildMetronProjectLaunchUrl('https://metron.example', {})).toBe(
      'https://metron.example/projects',
    )
  })
})
