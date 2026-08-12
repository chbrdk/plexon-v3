/**
 * Print magazine tokens — visual twin of EQC screen magazine for @react-pdf.
 * HTML Storybook twins in msqdx-ui Print/ should mirror these values.
 *
 * Print bias: soft stock, generous leading, folio hairlines, editorial spreads
 * (two-column lists / persona tiles) — not screen dashboard chrome.
 */

import { StyleSheet } from '@react-pdf/renderer'
import { PDF_TYPE_LINE_HEIGHT } from '@/lib/paths/pdf-typography'
import {
  PDF_PAGE_HEIGHT_PT,
  PDF_PAGE_WIDTH_PT,
} from '@/lib/paths/pdf-print-tokens'
import {
  MAG_FONT_FAMILY,
  registerMagazinePdfFonts,
} from '@/lib/assistant/reports/pdf/magazine/register-mag-fonts'

registerMagazinePdfFonts()

export const MAG_PAGE_WIDTH = PDF_PAGE_WIDTH_PT
export const MAG_PAGE_HEIGHT = PDF_PAGE_HEIGHT_PT

/** Outer page margin — print safety + breathing room from trim. */
export const MAG_MARGIN_X = 56
export const MAG_MARGIN_TOP = 52
export const MAG_MARGIN_BOTTOM = 60
/** Inner measure (magazine column), centered in the page. */
export const MAG_COLUMN_MAX = 428
export const MAG_FOOTER_H = 28

export const magColors = {
  ink: '#141414',
  inkSoft: '#3a3a38',
  muted: '#6e6e6a',
  line: '#dddcd7',
  paper: '#f8f7f4',
  wash: '#efeee9',
  accent: '#00ca55',
  accentInk: '#007a33',
  neg: '#c23b2a',
  warn: '#b45309',
  track: '#e6e5e0',
  donut: ['#141414', '#00ca55', '#5a5a5a', '#9a9a9a', '#c23b2a', '#3a7bd5', '#b45309', '#6b6b6b'] as const,
} as const

export const magStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: magColors.paper,
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9,
    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
    color: magColors.ink,
    paddingTop: MAG_MARGIN_TOP,
    paddingBottom: MAG_MARGIN_BOTTOM,
    paddingLeft: MAG_MARGIN_X,
    paddingRight: MAG_MARGIN_X,
  },
  columnShell: {
    width: '100%',
    alignItems: 'center',
  },
  column: {
    width: MAG_COLUMN_MAX,
  },
  footer: {
    position: 'absolute',
    left: MAG_MARGIN_X,
    right: MAG_MARGIN_X,
    bottom: 20,
    flexDirection: 'column',
  },
  footerRule: {
    borderBottomWidth: 0.6,
    borderBottomColor: magColors.line,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chapterIndex: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 700,
    color: magColors.accentInk,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  headline: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 14,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.28,
    lineHeight: 1.18,
    marginBottom: 12,
    maxWidth: '90%',
  },
  coverHeadline: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 22,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.45,
    lineHeight: 1.12,
    marginBottom: 16,
    maxWidth: '86%',
  },
  lede: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 10,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.55,
    marginBottom: 22,
    maxWidth: '94%',
  },
  body: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8.5,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.62,
    marginBottom: 12,
  },
  meta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 400,
    color: magColors.muted,
    lineHeight: 1.4,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  chapterGap: {
    marginTop: 2,
    marginBottom: 6,
  },
  chapterStacked: {
    marginTop: 28,
    paddingTop: 22,
    borderTopWidth: 0.6,
    borderTopColor: magColors.line,
  },
  rule: {
    borderBottomWidth: 0.6,
    borderBottomColor: magColors.line,
    marginVertical: 18,
  },
  accentRule: {
    width: 28,
    borderBottomWidth: 2,
    borderBottomColor: magColors.accent,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  col: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
  chip: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.ink,
    borderWidth: 0.6,
    borderColor: magColors.line,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 5,
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: 2,
  },
  kpiValue: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 14,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 5,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 0.6,
    borderTopColor: magColors.line,
    gap: 18,
  },
  kpiCell: {
    width: '22%',
    minWidth: 68,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 26,
  },
  twoColCell: {
    width: '47%',
    flexDirection: 'column',
  },
  subEyebrow: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 26,
  },
  personaCell: {
    width: '47%',
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1.25,
    borderTopColor: magColors.ink,
  },
  personaSpread: {
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1.25,
    borderTopColor: magColors.ink,
  },
  personaName: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 11,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  personaBio: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.5,
    marginTop: 10,
    marginBottom: 6,
  },
  rankedIndex: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 700,
    color: magColors.accentInk,
    width: 20,
  },
  rankedIndexCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 700,
    color: magColors.accentInk,
    width: 16,
  },
  rankedLabel: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8.5,
    fontWeight: 400,
    color: magColors.ink,
    flexGrow: 1,
    flexShrink: 1,
    lineHeight: 1.5,
    paddingRight: 6,
  },
  rankedLabelCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 400,
    color: magColors.ink,
    flexGrow: 1,
    flexShrink: 1,
    lineHeight: 1.42,
    paddingRight: 4,
  },
  rankedMetaCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.muted,
    lineHeight: 1.4,
  },
  rankedMeta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 400,
    color: magColors.muted,
    lineHeight: 1.4,
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
  },
  rankedRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: magColors.ink,
    paddingBottom: 7,
    marginBottom: 2,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 7,
  },
  tableCell: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 400,
    color: magColors.inkSoft,
  },
  tableHeadCell: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  traitTrack: {
    height: 2,
    backgroundColor: magColors.track,
    marginTop: 3,
    marginBottom: 10,
  },
  traitTrackCompact: {
    height: 1.5,
    backgroundColor: magColors.track,
    marginTop: 2,
    marginBottom: 3,
  },
  traitFill: {
    height: 2,
    backgroundColor: magColors.accent,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 12,
    gap: 12,
  },
  ledgerScore: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 13,
    fontWeight: 700,
    width: 28,
  },
  /** Editorial pull — left accent, no filled card wash. */
  pullQuote: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 18,
    gap: 12,
  },
  pullQuoteBar: {
    width: 2.5,
    backgroundColor: magColors.accent,
    alignSelf: 'stretch',
  },
  pullQuoteBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
    paddingVertical: 2,
  },
  washBox: {
    backgroundColor: magColors.wash,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 18,
    marginBottom: 8,
  },
  distGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 0.6,
    borderTopColor: magColors.line,
  },
  distCol: {
    width: '30%',
  },
  sectionBlock: {
    marginTop: 24,
  },
  coverMetaBlock: {
    marginBottom: 22,
  },
})
