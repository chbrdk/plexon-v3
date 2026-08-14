/**
 * Temporary re-export surface — Mag* SSOT is `@msqdx/ui/mag`.
 * Prefer importing Mag primitives from `@msqdx/ui/mag` in new code.
 * Packing stays local.
 */
export {
  magColors,
  magStyles,
  MAG_MARGIN_X,
  MAG_COLUMN_MAX,
  MAG_PAGE_WIDTH,
  MAG_PAGE_HEIGHT,
  MagPage,
  MagCover,
  type MagCoverKpi,
  MagChapter,
  MagScoreRing,
  MagDonut,
  type MagDonutSlice,
  MagLedger,
  type MagLedgerItem,
  MagRankedList,
  type MagRankedItem,
  MagTraitBars,
  type MagTrait,
  MagTable,
  MagChip,
  MagChipRow,
  MagPersonaCard,
  type MagPersonaCardModel,
  type MagPersonaCardLabels,
  MagPersonaGrid,
  MagTwoColumn,
  MagPullQuote,
  registerMagazinePdfFonts,
  MAG_FONT_FAMILY,
} from '@msqdx/ui/mag'

export {
  estimateEqcChapterWeight,
  packEqcMagazinePages,
  MAG_PACK_BUDGET,
  MAG_PACK_BREATHING,
  MAG_PACK_MAX_PER_PAGE,
} from './pack-magazine-pages'
