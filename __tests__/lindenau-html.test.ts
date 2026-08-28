import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_LINDENAU_DEMO } from '@/lib/constants'

describe('Lindenau tourism HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'lindenau.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and contains the full tourism journey', () => {
    expect(PATH_LINDENAU_DEMO).toBe('/lindenau.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Wo Zeit')
    expect(html).toContain('Lindenau erleben')
    expect(html).toContain('48 Stunden')
    expect(html).toContain('Reise jetzt')
  })

  it('is self-contained and covers accessibility basics', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Zum Inhalt springen')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
  })
})
