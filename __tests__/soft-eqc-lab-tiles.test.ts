import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('EQC LabTile migration (local)', () => {
  it('Quickscan domain magazine uses LabTileStrip', () => {
    const src = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckDomainMagazineSection.tsx'),
      'utf8',
    )
    expect(src).toContain('LabTileStrip')
    expect(src).toContain('LabTile')
    expect(src).not.toContain('plexon-eqc-lab-tile')
  })

  it('barrel exports LabTile', () => {
    const barrel = readFileSync(path.join(root, 'lib/msqdx-ui.ts'), 'utf8')
    expect(barrel).toContain("from '../../msqdx-ui/packages/ui/src/components/LabTile'")
  })
})
