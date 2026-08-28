import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_KERNWERK_NATURAL_DEMO } from '@/lib/constants'

describe('KERNWERK natural corporate HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'kernwerk-natural.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and contains the natural industry journey', () => {
    expect(PATH_KERNWERK_NATURAL_DEMO).toBe('/kernwerk-natural.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Built with care.')
    expect(html).toContain('Engineering that feels considered.')
    expect(html).toContain('Complex work. Clear partnership.')
    expect(html).toContain('Good engineering keeps giving.')
    expect(html).toContain('Worldwide capability. Familiar faces.')
  })

  it('is self-contained and includes accessibility fundamentals', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Skip to content')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('Image placeholder')
  })
})
