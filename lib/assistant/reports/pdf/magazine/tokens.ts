/**
 * Print magazine tokens — visual twin of EQC screen magazine for @react-pdf.
 * HTML Storybook twins in msqdx-ui Print/ should mirror these values.
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

/** Outer page margin — keeps content off the trim edge. */
export const MAG_MARGIN_X = 52
export const MAG_MARGIN_TOP = 48
export const MAG_MARGIN_BOTTOM = 56
/** Inner measure (magazine column), centered in the page. */
export const MAG_COLUMN_MAX = 440
export const MAG_FOOTER_H = 22

export const magColors = {
  ink: '#111111',
  inkSoft: '#3d3d3d',
  muted: '#737373',
  line: '#e2e2e0',
  paper: '#ffffff',
  wash: '#f4f4f2',
  accent: '#00ca55',
  accentInk: '#007a33',
  neg: '#c23b2a',
  warn: '#b45309',
  track: '#ecece9',
  donut: ['#111111', '#00ca55', '#5a5a5a', '#9a9a9a', '#c23b2a', '#3a7bd5', '#b45309', '#6b6b6b'] as const,
} as const

export const magStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: magColors.paper,
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9.5,
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
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 400,
    color: magColors.muted,
    letterSpacing: 0.5,
  },
  eyebrow: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headline: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 15,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.25,
    lineHeight: 1.2,
    marginBottom: 10,
  },
  coverHeadline: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 19,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.35,
    lineHeight: 1.18,
    marginBottom: 14,
    maxWidth: '88%',
  },
  lede: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9.5,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.5,
    marginBottom: 20,
    maxWidth: '92%',
  },
  body: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.55,
    marginBottom: 10,
  },
  meta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8.5,
    fontWeight: 400,
    color: magColors.muted,
    lineHeight: 1.35,
    marginBottom: 4,
    letterSpacing: 0.15,
  },
  chapterGap: {
    marginTop: 4,
    marginBottom: 8,
  },
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: magColors.line,
    marginVertical: 16,
  },
  accentRule: {
    width: 36,
    borderBottomWidth: 2,
    borderBottomColor: magColors.accent,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  col: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
  chip: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7.5,
    fontWeight: 400,
    color: magColors.ink,
    borderWidth: 0.75,
    borderColor: magColors.line,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 5,
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginTop: 4,
  },
  kpiValue: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 15,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.35,
  },
  kpiLabel: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 26,
    gap: 20,
  },
  kpiCell: {
    width: '22%',
    minWidth: 72,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 22,
  },
  twoColCell: {
    width: '47%',
    flexDirection: 'column',
  },
  subEyebrow: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 6.5,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 22,
  },
  personaCell: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 0.75,
    borderColor: magColors.line,
  },
  personaSpread: {
    width: '100%',
    paddingVertical: 4,
  },
  personaName: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 12,
    fontWeight: 700,
    color: magColors.ink,
    letterSpacing: -0.15,
    marginBottom: 6,
  },
  personaBio: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8.5,
    fontWeight: 400,
    color: magColors.inkSoft,
    lineHeight: 1.45,
    marginTop: 8,
    marginBottom: 4,
  },
  rankedIndex: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9,
    fontWeight: 700,
    color: magColors.accentInk,
    width: 22,
  },
  rankedIndexCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 700,
    color: magColors.accentInk,
    width: 18,
  },
  rankedLabel: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 9,
    fontWeight: 400,
    color: magColors.ink,
    flexGrow: 1,
    flexShrink: 1,
    lineHeight: 1.45,
    paddingRight: 6,
  },
  rankedLabelCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 400,
    color: magColors.ink,
    flexGrow: 1,
    flexShrink: 1,
    lineHeight: 1.4,
    paddingRight: 4,
  },
  rankedMetaCompact: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 400,
    color: magColors.muted,
    lineHeight: 1.35,
  },
  rankedMeta: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8,
    fontWeight: 400,
    color: magColors.muted,
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
  },
  rankedRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: magColors.ink,
    paddingBottom: 6,
    marginBottom: 4,
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 6,
  },
  tableCell: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 8.5,
    fontWeight: 400,
    color: magColors.inkSoft,
  },
  tableHeadCell: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 7,
    fontWeight: 400,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  traitTrack: {
    height: 2.5,
    backgroundColor: magColors.track,
    marginTop: 3,
    marginBottom: 8,
  },
  traitTrackCompact: {
    height: 2,
    backgroundColor: magColors.track,
    marginTop: 2,
    marginBottom: 2,
  },
  traitFill: {
    height: 3,
    backgroundColor: magColors.accent,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 10,
    gap: 12,
  },
  ledgerScore: {
    fontFamily: MAG_FONT_FAMILY,
    fontSize: 12,
    fontWeight: 700,
    width: 26,
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
    gap: 16,
    marginTop: 8,
  },
  distCol: {
    width: '30%',
  },
  sectionBlock: {
    marginTop: 22,
  },
})
