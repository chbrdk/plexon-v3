import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_CARO_DEMO } from '@/lib/constants'

describe('CARO typographic tribute HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'caro.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and contains the CARO tribute journey', () => {
    expect(PATH_CARO_DEMO).toBe('/caro.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('The best person')
    expect(html).toContain('Three reasons.')
    expect(html).toContain('Kindness')
    expect(html).toContain('Main character.')
    expect(html).toContain('CARO forever')
  })

  it('is self-contained and includes accessibility and social metadata', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Skip to content')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('property="og:title"')
  })
})
