import { describe, expect, it } from 'vitest'
import {
  clampEqcChapterIndex,
  nextEqcChapterIndex,
  prevEqcChapterIndex,
} from '@/components/event-quick-check/useEqcPresentationMode'

describe('eqc presentation chapter index helpers', () => {
  it('clamps within bounds', () => {
    expect(clampEqcChapterIndex(-1, 4)).toBe(0)
    expect(clampEqcChapterIndex(99, 4)).toBe(3)
    expect(clampEqcChapterIndex(2, 0)).toBe(0)
  })

  it('moves next and previous without wrapping', () => {
    expect(nextEqcChapterIndex(0, 3)).toBe(1)
    expect(nextEqcChapterIndex(2, 3)).toBe(2)
    expect(prevEqcChapterIndex(2, 3)).toBe(1)
    expect(prevEqcChapterIndex(0, 3)).toBe(0)
  })
})
