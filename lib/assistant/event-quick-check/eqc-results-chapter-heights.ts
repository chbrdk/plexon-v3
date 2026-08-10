/** Viewport fraction: chapter is "tall" when measured height is at least this. */
export const EQC_CHAPTER_TALL_MIN_VH = 100

/** Cover / masthead chapter target height (svh). */
export const EQC_COVER_CHAPTER_VH = 70

/** Gap between two tall chapters (vh). */
export const EQC_CHAPTER_GAP_TALL_VH = 50

/** Gap when either adjacent chapter is short (vh). */
export const EQC_CHAPTER_GAP_SHORT_VH = 20

export type EqcChapterHeightKind = 'tall' | 'short'

/**
 * Mark direct children of an EQC results root as tall/short for adaptive chapter gaps.
 * Tall = measured height ≥ `EQC_CHAPTER_TALL_MIN_VH` of the viewport.
 */
export function syncEqcResultsChapterHeights(root: HTMLElement): void {
  const thresholdPx = (window.innerHeight * EQC_CHAPTER_TALL_MIN_VH) / 100
  for (const child of root.children) {
    if (!(child instanceof HTMLElement)) continue
    const height = child.getBoundingClientRect().height
    child.dataset.eqcChapter =
      height >= thresholdPx - 0.5 ? ('tall' satisfies EqcChapterHeightKind) : ('short' satisfies EqcChapterHeightKind)
  }
}
