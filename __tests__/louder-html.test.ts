import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_LOUDER_DEMO } from '@/lib/constants'

describe('LOUDER social brand HTML demo', () => {
  const htmlPath = path.join(process.cwd(), 'public', 'louder.html')
  const html = fs.readFileSync(htmlPath, 'utf8')

  it('uses the canonical public route and contains the social-first brand journey', () => {
    expect(PATH_LOUDER_DEMO).toBe('/louder.html')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Make the feed feel something.')
    expect(html).toContain('Built for the group chat.')
    expect(html).toContain('Culture doesn\'t wait')
    expect(html).toContain('One team.')
    expect(html).toContain('Made with people, not personas.')
  })

  it('is self-contained and includes accessibility and social metadata', () => {
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//)
    expect(html).toContain('Skip to content')
    expect(html).toContain('aria-label=')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('Image placeholder')
  })
})
