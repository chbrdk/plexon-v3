import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('metron share magazine', () => {
  it('share page uses magazine chrome with copy + print', () => {
    const page = readFileSync(
      resolve(__dirname, '../app/share/metron/[token]/page.tsx'),
      'utf8',
    )
    const mag = readFileSync(
      resolve(__dirname, '../components/assistant/MetronShareMagazine.tsx'),
      'utf8',
    )
    expect(page).toContain('MetronShareMagazine')
    expect(mag).toContain('metron-share-magazine')
    expect(mag).toContain('shareCopyAgain')
    expect(mag).toContain('sharePrintPdf')
    expect(mag).toContain('shareReadOnly')
    expect(mag).toContain('window.print')
  })
})
