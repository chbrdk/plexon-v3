import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveMagcloudCapability } from '../lib/platform-project-capability-summary'
import { buildMagcloudProjectLaunchUrl } from '../lib/magcloud-launch-url'

const root = path.resolve(__dirname, '..')

describe('MAGCLOUD Collection home chip', () => {
  it('wires overview + knowledge band + capability view', () => {
    const overview = readFileSync(
      path.join(root, 'components/products/CollectionOverviewBand.tsx'),
      'utf8',
    )
    const knowledge = readFileSync(
      path.join(root, 'components/products/CollectionKnowledgeBand.tsx'),
      'utf8',
    )
    const views = readFileSync(
      path.join(root, 'components/products/CollectionCapabilityViews.tsx'),
      'utf8',
    )
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    const route = readFileSync(
      path.join(root, 'app/api/platform/projects/[platformProjectId]/dashboard/route.ts'),
      'utf8',
    )
    expect(overview).toContain('data-chapter="magcloud"')
    expect(knowledge).toContain('MagcloudCapabilityView')
    expect(knowledge).toContain("'magcloud'")
    expect(views).toContain('magcloud-capability-view')
    expect(dash).toContain('magcloudHref')
    expect(dash).toContain('magcloud={data.magcloud')
    expect(route).toContain('fetchMagcloudPlatformProjectSummary')
    expect(route).toContain('magcloudProject:')
  })

  it('resolves binding fallback and launch URL', () => {
    expect(
      resolveMagcloudCapability(null, [
        { productId: 'magcloud', externalProjectId: 'board-1', syncStatus: 'pending' },
      ]),
    ).toEqual({ externalProjectId: 'board-1' })
    expect(
      buildMagcloudProjectLaunchUrl('https://magcloud.example', {
        platformProjectId: 'pp-1',
      }),
    ).toBe('https://magcloud.example/boards?platformProjectId=pp-1')
  })
})
