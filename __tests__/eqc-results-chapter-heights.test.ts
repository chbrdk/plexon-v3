import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  EQC_CHAPTER_TALL_MIN_VH,
  EQC_COVER_CHAPTER_VH,
  EQC_CHAPTER_GAP_SHORT_VH,
  EQC_CHAPTER_GAP_TALL_VH,
  syncEqcResultsChapterHeights,
} from '@/lib/assistant/event-quick-check/eqc-results-chapter-heights'

describe('eqc-results-chapter-heights', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 800)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exports scrollytelling height/gap constants', () => {
    expect(EQC_CHAPTER_TALL_MIN_VH).toBe(100)
    expect(EQC_COVER_CHAPTER_VH).toBe(70)
    expect(EQC_CHAPTER_GAP_TALL_VH).toBe(50)
    expect(EQC_CHAPTER_GAP_SHORT_VH).toBe(20)
  })

  it('marks children tall when height is at least 100vh', () => {
    const root = document.createElement('div')
    const short = document.createElement('div')
    const tall = document.createElement('div')
    root.append(short, tall)

    vi.spyOn(short, 'getBoundingClientRect').mockReturnValue({
      height: 560, // 70vh of 800
      width: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    vi.spyOn(tall, 'getBoundingClientRect').mockReturnValue({
      height: 800,
      width: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    syncEqcResultsChapterHeights(root)

    expect(short.dataset.eqcChapter).toBe('short')
    expect(tall.dataset.eqcChapter).toBe('tall')
  })
})
