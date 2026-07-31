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
  ...collectTsx(path.join(root, 'components/event-quick-check')).map((f) =>
    path.relative(root, f).split(path.sep).join('/')
  ),
]

describe('event quick check ui rebuild (wave 6)', () => {
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

  it('spec is Accepted for wave 6', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/ui-migrate-event-quick-check.md'),
      'utf8'
    )
    expect(spec).toContain('Accepted')
    expect(spec).toContain('plexon-eqc-')
  })
})
