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
    expect(client).toContain('plexon-eqc-compose')
    expect(client).not.toContain('PlexonPageChrome')
    const globals = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(globals).toContain('.plexon-eqc-compose__lead .ds-input')
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
    expect(dash).toContain('EventQuickCheckResultsMasthead')
    expect(dash).toContain('SectionChrome')
    expect(dash).not.toContain('StatLede')
    expect(dash).toContain('plexon-eqc-mag-persona-lists')
    expect(dash).toContain('EventQuickCheckGeoMagazineSection')
    expect(dash).toContain('EventQuickCheckDomainMagazineSection')
    expect(dash).toContain('EventQuickCheckInsightsMagazineSection')
    expect(dash).not.toContain('assistant-ui')
    expect(dash).not.toContain('UiMetricGrid')
    expect(dash).not.toContain('UiBlockSurface')
    expect(dash).not.toContain('EventQuickCheckReportSections')
    expect(dash).not.toContain('--color-text-on-light')
    expect(geoMag).toContain('EventQuickCheckScoreRing')
    expect(geoMag).toContain('EventQuickCheckVoiceRadar')
    expect(geoMag).toContain('EventQuickCheckMovesGallery')
    expect(geoMag).toContain('plexon-eqc-geo-voice__board')
    expect(geoMag).not.toContain('StatusMeterPanel')
    expect(geoMag).toContain('EventQuickCheckCitationSection')
    // Snapshot: dials (rings) before lede copy
    expect(geoMag.indexOf('plexon-eqc-geo-snapshot__dials')).toBeLessThan(
      geoMag.indexOf('plexon-eqc-geo-snapshot__lede'),
    )
    const globals = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(globals).toMatch(
      /\.plexon-eqc-results-scroll \{[\s\S]*?scroll-snap-type:\s*y proximity/,
    )
    expect(globals).toMatch(
      /\.plexon-eqc-results > \.plexon-dash-band \{[\s\S]*?min-height:\s*100svh/,
    )
    expect(globals).toContain('.plexon-eqc-voice-radar__shape')
    expect(globals).toContain('.plexon-eqc-geo-voice__board')
    expect(globals).toContain('.plexon-eqc-masthead__hero')
    expect(globals).toContain('.plexon-eqc-cover__score-num')
    expect(citation).toContain('plexon-eqc-geo-models__strip')
    expect(citation).toContain('buildOwnDomainMultiModelChart')
    expect(panel).toContain('SectionChrome')
    expect(panel).not.toContain("from '@/components/assistant-ui/templates/UiBlockSurface'")
    expect(panel).not.toContain("from '@msqdx/react'")

    expect(globals).toMatch(
      /\.plexon-eqc-mag-persona-lists\s*\{[^}]*padding-block:\s*2\.75rem/s,
    )
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
    const ticks = readFileSync(
      path.join(root, 'components/event-quick-check/EqcChartTooltip.tsx'),
      'utf8'
    )
    expect(ticks).toContain('var(--ink')
    for (const src of [bar, competitor]) {
      expect(src).toContain('EQC_CHART_TICK_INK')
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
