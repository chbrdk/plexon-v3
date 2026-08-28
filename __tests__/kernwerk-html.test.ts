import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_KERNWERK_DEMO } from '@/lib/constants'

describe('KERNWERK machinery HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'kernwerk.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and presents the complete industrial story', () => {
    expect(PATH_KERNWERK_DEMO).toBe('/kernwerk.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Built for the')
    expect(html).toContain('Machinery families')
    expect(html).toContain('Lifecycle partnership')
    expect(html).toContain('Global presence')
    expect(html).toContain('Start a conversation')
  })

  it('is self-contained and includes accessibility fundamentals', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Skip to content')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
  })
})
