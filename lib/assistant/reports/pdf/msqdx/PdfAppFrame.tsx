import React from 'react';
import { View } from '@react-pdf/renderer';
import {
  PDF_MINIMAL_LOGO_HEIGHT_PT,
  PDF_MINIMAL_LOGO_WIDTH_PT,
  PDF_PAGE_BACKGROUND,
  PDF_PAGE_MARGIN_PT,
  pdfShowsPageLogoForSide,
  type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { MsqdxLogoPdf } from '@/lib/assistant/reports/pdf/msqdx/MsqdxLogoPdf';

export function PdfMinimalPageChrome({ side }: { side: PdfSpreadSide }) {
  return (
    <>
      <View
        fixed
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: PDF_PAGE_BACKGROUND,
        }}
      />
      {pdfShowsPageLogoForSide(side) ? (
        <View
          fixed
          style={{
            position: 'absolute',
            top: PDF_PAGE_MARGIN_PT,
            left: PDF_PAGE_MARGIN_PT,
          }}
        >
          <MsqdxLogoPdf
            width={PDF_MINIMAL_LOGO_WIDTH_PT}
            height={PDF_MINIMAL_LOGO_HEIGHT_PT}
          />
        </View>
      ) : null}
    </>
  );
}
