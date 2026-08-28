import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_KERNWERK_CLASSIC_DEMO } from '@/lib/constants'

describe('KERNWERK classic corporate HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'kernwerk-classic.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and contains the classic corporate journey', () => {
    expect(PATH_KERNWERK_CLASSIC_DEMO).toBe('/kernwerk-classic.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Reliable machinery')
    expect(html).toContain('Our solutions')
    expect(html).toContain('About KERNWERK')
    expect(html).toContain('Lifecycle services')
    expect(html).toContain('News &amp; insights')
  })

  it('is self-contained and includes accessibility fundamentals', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Skip to content')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
  })
})
