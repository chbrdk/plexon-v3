/**
 * Suite Docs & Help — Wave 3 walkthroughs + analytics contracts.
 * Spec: specs/domain/suite-help-docs.md
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  API_HELP_EVENTS,
  API_HELP_WALKTHROUGHS,
  PATH_PROJECTS,
} from '@/lib/constants'
import {
  HELP_EVENT_TYPES,
  isHelpEventType,
} from '@/lib/help/analytics'
import {
  clearHelpWalkthroughCache,
  getHelpWalkthrough,
  listHelpWalkthroughs,
  loadHelpWalkthroughs,
} from '@/lib/help/walkthroughs'

const root = path.resolve(__dirname, '..')

describe('suite help Wave 3 walkthroughs + analytics', () => {
  clearHelpWalkthroughCache()

  it('loads bilingual walkthrough seeds with anchors', () => {
    const all = loadHelpWalkthroughs()
    expect(all.length).toBeGreaterThanOrEqual(3)
    expect(existsSync(path.join(root, 'content/help/walkthroughs/index.json'))).toBe(true)

    const plexon = listHelpWalkthroughs({
      locale: 'de',
      product: 'plexon',
      pathname: PATH_PROJECTS,
    })
    expect(plexon.some((w) => w.id === 'plexon.collections.first-collection')).toBe(true)

    const detail = getHelpWalkthrough('plexon.collections.first-collection', 'en')
    expect(detail?.steps[0]?.anchor).toContain('data-help-anchor')
    expect(detail?.title).toMatch(/Collection/i)

    const checkion = listHelpWalkthroughs({
      locale: 'en',
      product: 'checkion',
      pathname: '/scans',
    })
    expect(checkion.some((w) => w.id === 'checkion.scan.first-wcag')).toBe(true)
  })

  it('exposes analytics + walkthrough path constants and event guards', () => {
    expect(API_HELP_EVENTS).toBe('/api/help/events')
    expect(API_HELP_WALKTHROUGHS).toBe('/api/help/walkthroughs')
    expect(existsSync(path.join(root, 'app/api/help/events/route.ts'))).toBe(true)
    expect(existsSync(path.join(root, 'app/api/help/walkthroughs/route.ts'))).toBe(true)
    expect(existsSync(path.join(root, 'components/help/HelpWalkthrough.tsx'))).toBe(true)
    expect(isHelpEventType('help_open')).toBe(true)
    expect(isHelpEventType('help_walkthrough_completed')).toBe(true)
    expect(isHelpEventType('not_a_real_event')).toBe(false)
    expect(HELP_EVENT_TYPES).toContain('help_search_zero')
  })

  it('wires NavRail help anchor + AppShell projects item', () => {
    const shell = readFileSync(path.join(root, 'components/AppShell.tsx'), 'utf8')
    expect(shell).toContain("dataHelpAnchor: 'nav-projects'")
    const navRail = readFileSync(
      path.join(root, '../msqdx-ui/packages/ui/src/components/NavRail.tsx'),
      'utf8',
    )
    expect(navRail).toContain('dataHelpAnchor')
    expect(navRail).toContain('data-help-anchor')
  })

  it('documents Wave 3 paths in knowledge/paths.md', () => {
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8')
    expect(paths).toContain('API_HELP_EVENTS')
    expect(paths).toContain('API_HELP_WALKTHROUGHS')
    expect(paths).toContain('Wave 0–5')
  })
})
