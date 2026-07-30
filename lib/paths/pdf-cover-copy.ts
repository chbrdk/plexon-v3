/** Cover copy helpers for MSQDX-branded PDF exports. */
export const PDF_COVER_BRAND_LABEL = 'MSQDX';

export function pdfCoverEyebrow(subtitle: string): string {
  return `${PDF_COVER_BRAND_LABEL} · ${subtitle}`;
}
