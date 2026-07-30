/**
 * Print / PDF layout tokens — shared by Quick Check PDF export.
 * @see CHECKION/lib/paths/pdf-print-tokens.ts (canonical twin)
 */

/** DIN A4 in PDF points */
export const PDF_PAGE_WIDTH_PT = 595.28;
export const PDF_PAGE_HEIGHT_PT = 841.89;

export const PDF_PAGE_BACKGROUND = '#ffffff';
export const PDF_BRAND_COLOR = '#00ca55';
export const PDF_BRAND_TINT = '#f3f4f6';
export const PDF_INNER_BACKGROUND = '#ffffff';
export const PDF_RADIUS_BUTTON_PT = 8;
export const PDF_PAGE_MARGIN_PT = 40;
export const PDF_CONTENT_COLUMN_MAX_WIDTH_PT = 420;
export const PDF_BINDING_GUTTER_PT = 8;
export const PDF_FOOTER_RESERVE_PT = 22;
export const PDF_MINIMAL_LOGO_WIDTH_PT = 52;
export const PDF_MINIMAL_LOGO_HEIGHT_PT = 12;
export const PDF_MINIMAL_LOGO_GAP_PT = 10;
export const PDF_FOOTER_LOGO_GAP_PT = 6;

export function pdfFooterAlignsOuterLeft(pageNumber: number): boolean {
  return pageNumber % 2 === 0;
}

export const PDF_FRAME_INSET_PT = 0;
export const PDF_CONTENT_PADDING_PT = PDF_PAGE_MARGIN_PT;

export type PdfSpreadSide = 'cover' | 'left' | 'right';

export const PDF_DOCUMENT_PAGE_LAYOUT = 'twoPageRight' as const;

export function pdfSpreadSideFromIndex(index: number): PdfSpreadSide {
  const pageNumber = index + 1;
  if (pageNumber === 1) return 'cover';
  return pageNumber % 2 === 0 ? 'left' : 'right';
}

export function pdfShowsPageLogoForSide(side: PdfSpreadSide): boolean {
  return side === 'cover';
}

export function pdfContentMarginsForSide(side: PdfSpreadSide): {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
} {
  const m = PDF_PAGE_MARGIN_PT;
  const bind = PDF_BINDING_GUTTER_PT;
  const logoBlock = pdfShowsPageLogoForSide(side)
    ? PDF_MINIMAL_LOGO_HEIGHT_PT + PDF_MINIMAL_LOGO_GAP_PT
    : 0;
  const bottom = m + PDF_FOOTER_RESERVE_PT;

  if (side === 'cover') {
    return {
      paddingTop: m + logoBlock,
      paddingBottom: bottom,
      paddingLeft: m,
      paddingRight: m,
    };
  }
  if (side === 'left') {
    return {
      paddingTop: m,
      paddingBottom: bottom,
      paddingLeft: m,
      paddingRight: m + bind,
    };
  }
  return {
    paddingTop: m,
    paddingBottom: bottom,
    paddingLeft: m + bind,
    paddingRight: m,
  };
}

export function pdfFooterInsetsForSide(side: PdfSpreadSide): {
  left: number;
  right: number;
  bottom: number;
} {
  const m = PDF_PAGE_MARGIN_PT;
  const bind = PDF_BINDING_GUTTER_PT;
  const bottom = PDF_PAGE_MARGIN_PT;

  if (side === 'cover') {
    return { left: m, right: m, bottom };
  }
  if (side === 'left') {
    return { left: m, right: m + bind, bottom };
  }
  return { left: m + bind, right: m, bottom };
}
