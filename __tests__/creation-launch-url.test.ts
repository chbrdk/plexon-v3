import { describe, expect, it } from 'vitest'
import { buildCreationProjectLaunchUrl } from '../lib/creation-launch-url'

describe('creation launch url', () => {
  it('builds projects deep-link with platformProjectId', () => {
    expect(
      buildCreationProjectLaunchUrl('https://creation.example/', {
        platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      }),
    ).toBe(
      'https://creation.example/projects?platformProjectId=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    )
  })

  it('omits query when unbound', () => {
    expect(buildCreationProjectLaunchUrl('https://creation.example', {})).toBe(
      'https://creation.example/projects',
    )
  })
})
