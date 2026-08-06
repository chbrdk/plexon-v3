import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

function collectTsx(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...collectTsx(full))
    else if (name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const eqcFiles = [
  'app/event-quick-check/page.tsx',
  'components/assistant/reports/event-quick-check/EventQuickCheckReportSections.tsx',
  'components/assistant/reports/ReportSectionHeader.tsx',
  ...collectTsx(path.join(root, 'components/event-quick-check')).map((f) =>
    path.relative(root, f).split(path.sep).join('/')
  ),
]

describe('event quick check ui rebuild (wave 6 + wave 7 results)', () => {
  it('EQC file set has no @mui or @msqdx/react', () => {
    expect(eqcFiles.length).toBeGreaterThan(10)
    for (const rel of eqcFiles) {
      const src = readFileSync(path.join(root, rel), 'utf8')
      expect(src, rel).not.toContain("from '@msqdx/react'")
      expect(src, rel).not.toContain("from '@mui/material'")
    }
  })

  it('uses @msqdx/ui chrome on page and workflow client', () => {
    const page = readFileSync(path.join(root, 'app/event-quick-check/page.tsx'), 'utf8')
    const client = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckPageClient.tsx'),
      'utf8'
    )

    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('plexon-eqc-stage')
    expect(page).toContain('EmptyState')
    expect(client).toContain("from '@msqdx/ui'")
    expect(client).toContain('Field')
    expect(client).toContain('ToggleGroup')
    expect(client).not.toContain('PlexonPageChrome')
  })

  it('done results use magazine DS primitives without Ui* / light-surface bridges', () => {
    const dash = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckDashboardView.tsx'),
      'utf8'
    )
    const panel = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckDashboardPanel.tsx'),
      'utf8'
    )
    const geoMag = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckGeoMagazineSection.tsx'),
      'utf8'
    )
    const citation = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckCitationSection.tsx'),
      'utf8'
    )
    expect(dash).toContain('plexon-magazine')
    expect(dash).toContain('plexon-eqc-results')
    expect(dash).toContain('SectionChrome')
    expect(dash).toContain('StatLede')
    expect(dash).toContain('EventQuickCheckGeoMagazineSection')
    expect(dash).toContain('EventQuickCheckDomainMagazineSection')
    expect(dash).not.toContain('assistant-ui')
    expect(dash).not.toContain('UiMetricGrid')
    expect(dash).not.toContain('UiBlockSurface')
    expect(dash).not.toContain('EventQuickCheckReportSections')
    expect(dash).not.toContain('--color-text-on-light')
    expect(geoMag).toContain('StatusMeterPanel')
    expect(geoMag).toContain('EventQuickCheckCitationSection')
    expect(citation).toContain('plexon-eqc-geo-models__strip')
    expect(citation).toContain('buildOwnDomainMultiModelChart')
    expect(panel).toContain('SectionChrome')
    expect(panel).not.toContain("from '@/components/assistant-ui/templates/UiBlockSurface'")
    expect(panel).not.toContain("from '@msqdx/react'")
  })

  it('EQC charts use theme tokens, not light-only text colors', () => {
    const bar = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckGeoBarChart.tsx'),
      'utf8'
    )
    const competitor = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckCitationCompetitorChart.tsx'),
      'utf8'
    )
    for (const src of [bar, competitor]) {
      expect(src).toContain("var(--ink)")
      expect(src).not.toContain('--color-text-on-light')
      expect(src).not.toContain("from '@msqdx/tokens'")
    }
  })

  it('spec is Accepted for wave 6 / wave 7 results', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/ui-migrate-event-quick-check.md'),
      'utf8'
    )
    expect(spec).toContain('Accepted')
    expect(spec).toContain('plexon-eqc-')
    expect(spec).toContain('Wave 7')
    expect(spec).toContain('plexon-magazine')
  })

  it('curated @msqdx/ui barrel exports GEO magazine primitives', () => {
    const barrel = readFileSync(path.join(root, 'lib/msqdx-ui.ts'), 'utf8')
    expect(barrel).toContain('StatusMeterPanel')
    expect(barrel).toContain('DataTable')
  })
})
