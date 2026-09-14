import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('soft EQC lab tiles', () => {
  it('Quickscan lab tiles and collection cards use --radius-tile', () => {
    const css = readFileSync(path.join(root, 'styles/globals.css'), 'utf8')
    expect(css).toMatch(/\.plexon-eqc-lab-tile\s*\{[\s\S]*?border-radius:\s*var\(--radius-tile/)
    expect(css).toMatch(/\.plexon-collection-card\s*\{[\s\S]*?border-radius:\s*var\(--radius-tile/)
  })
})
