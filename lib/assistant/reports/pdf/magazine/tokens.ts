/**
 * Print magazine tokens — visual twin of EQC screen magazine for @react-pdf.
 * HTML Storybook twins in msqdx-ui Print/ should mirror these values.
 */

import { StyleSheet } from '@react-pdf/renderer'
import { PDF_FONT_FAMILIES } from '@/lib/paths/pdf-fonts'
import { PDF_TYPE_LINE_HEIGHT, PDF_TYPE_WEIGHT } from '@/lib/paths/pdf-typography'
import {
  PDF_PAGE_HEIGHT_PT,
  PDF_PAGE_WIDTH_PT,
} from '@/lib/paths/pdf-print-tokens'

export const MAG_PAGE_WIDTH = PDF_PAGE_WIDTH_PT
export const MAG_PAGE_HEIGHT = PDF_PAGE_HEIGHT_PT
export const MAG_MARGIN = 36
export const MAG_FOOTER_H = 28
export const MAG_CONTENT_BOTTOM = MAG_MARGIN + MAG_FOOTER_H

export const magColors = {
  ink: '#111111',
  inkSoft: '#3a3a3a',
  muted: '#6b6b6b',
  line: '#d8d8d8',
  paper: '#ffffff',
  wash: '#f6f6f5',
  accent: '#00ca55',
  accentInk: '#007a33',
  neg: '#c23b2a',
  warn: '#b45309',
  track: '#e8e8e6',
  donut: ['#111111', '#00ca55', '#5a5a5a', '#9a9a9a', '#c23b2a', '#3a7bd5', '#b45309', '#6b6b6b'] as const,
} as const

export const magStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: magColors.paper,
    fontFamily: PDF_FONT_FAMILIES.body,
    fontSize: 9.5,
    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
    color: magColors.ink,
    paddingTop: MAG_MARGIN,
    paddingBottom: MAG_CONTENT_BOTTOM,
    paddingLeft: MAG_MARGIN,
    paddingRight: MAG_MARGIN,
  },
  footer: {
    position: 'absolute',
    left: MAG_MARGIN,
    right: MAG_MARGIN,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    fontSize: 7,
    fontWeight: PDF_TYPE_WEIGHT.light,
    color: magColors.muted,
    letterSpacing: 0.4,
  },
  eyebrow: {
    fontFamily: PDF_FONT_FAMILIES.body,
    fontSize: 7.5,
    fontWeight: PDF_TYPE_WEIGHT.light,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  headline: {
    fontFamily: PDF_FONT_FAMILIES.headline,
    fontSize: 18,
    fontWeight: PDF_TYPE_WEIGHT.bold,
    color: magColors.ink,
    letterSpacing: -0.6,
    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
    marginBottom: 6,
  },
  coverHeadline: {
    fontFamily: PDF_FONT_FAMILIES.headline,
    fontSize: 28,
    fontWeight: PDF_TYPE_WEIGHT.bold,
    color: magColors.ink,
    letterSpacing: -1.2,
    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
    marginBottom: 8,
  },
  lede: {
    fontSize: 10.5,
    color: magColors.inkSoft,
    lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
    marginBottom: 12,
  },
  body: {
    fontSize: 9.5,
    color: magColors.inkSoft,
    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
    marginBottom: 6,
  },
  meta: {
    fontSize: 8,
    color: magColors.muted,
    lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
    marginBottom: 4,
  },
  chapterGap: {
    marginTop: 14,
    marginBottom: 4,
  },
  rule: {
    borderBottomWidth: 0.75,
    borderBottomColor: magColors.line,
    marginVertical: 10,
  },
  accentRule: {
    width: 36,
    borderBottomWidth: 2,
    borderBottomColor: magColors.accent,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  col: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
  },
  chip: {
    fontSize: 7.5,
    color: magColors.ink,
    borderWidth: 0.75,
    borderColor: magColors.line,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: PDF_FONT_FAMILIES.headline,
    fontSize: 20,
    fontWeight: PDF_TYPE_WEIGHT.bold,
    color: magColors.ink,
    letterSpacing: -0.8,
  },
  kpiLabel: {
    fontSize: 7,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginTop: 2,
  },
  rankedIndex: {
    fontFamily: PDF_FONT_FAMILIES.headline,
    fontSize: 11,
    fontWeight: PDF_TYPE_WEIGHT.bold,
    color: magColors.accentInk,
    width: 22,
  },
  rankedLabel: {
    fontSize: 9.5,
    color: magColors.ink,
    flexGrow: 1,
    flexShrink: 1,
  },
  rankedMeta: {
    fontSize: 8,
    color: magColors.muted,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: magColors.ink,
    paddingBottom: 4,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: 8,
    color: magColors.inkSoft,
  },
  tableHeadCell: {
    fontSize: 7,
    color: magColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  traitTrack: {
    height: 4,
    backgroundColor: magColors.track,
    marginTop: 3,
    marginBottom: 6,
  },
  traitFill: {
    height: 4,
    backgroundColor: magColors.accent,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: magColors.line,
    paddingVertical: 7,
    gap: 10,
  },
  ledgerScore: {
    fontFamily: PDF_FONT_FAMILIES.headline,
    fontSize: 14,
    fontWeight: PDF_TYPE_WEIGHT.bold,
    width: 28,
  },
  washBox: {
    backgroundColor: magColors.wash,
    padding: 10,
    marginBottom: 8,
  },
})
