import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { PDF_CONTENT_COLUMN_MAX_WIDTH_PT } from '@/lib/paths/pdf-print-tokens';
import {
  PDF_MINIMAL_LOGO_HEIGHT_PT,
  PDF_MINIMAL_LOGO_WIDTH_PT,
  pdfFooterAlignsOuterLeft,
  pdfFooterInsetsForSide,
  type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfColors, pdfStyles } from '@/lib/assistant/reports/pdf/msqdx/pdf-styles';
import { MsqdxLogoPdf } from '@/lib/assistant/reports/pdf/msqdx/MsqdxLogoPdf';

export function PdfContentColumn({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: PDF_CONTENT_COLUMN_MAX_WIDTH_PT }}>{children}</View>
    </View>
  );
}

export function PdfSectionHeader({ title }: { title: string }) {
  return <Text style={pdfStyles.sectionTitle}>{title}</Text>;
}

export function PdfSectionIntro({ text }: { text: string }) {
  return <Text style={pdfStyles.sectionIntroText}>{text}</Text>;
}

export function PdfFooter({
  pageNumber,
  totalPages,
  locale,
  spreadSide = 'cover',
}: {
  pageNumber: number;
  totalPages: number;
  locale: 'de' | 'en';
  spreadSide?: PdfSpreadSide;
}) {
  const pageLabel = locale === 'de' ? 'Seite' : 'Page';
  const ofLabel = locale === 'de' ? 'von' : 'of';
  const insets = pdfFooterInsetsForSide(spreadSide);
  const outerLeft = pdfFooterAlignsOuterLeft(pageNumber);
  const pageText = `${pageLabel} ${pageNumber} ${ofLabel} ${totalPages}`;
  const logo = (
    <MsqdxLogoPdf
      width={PDF_MINIMAL_LOGO_WIDTH_PT}
      height={PDF_MINIMAL_LOGO_HEIGHT_PT}
      color={pdfColors.gray400}
    />
  );

  return (
    <View
      style={[
        pdfStyles.footer,
        {
          left: insets.left,
          right: insets.right,
          bottom: insets.bottom,
          justifyContent: outerLeft ? 'flex-start' : 'flex-end',
        },
      ]}
      fixed
    >
      {outerLeft ? (
        <>
          <Text>{pageText}</Text>
          <View style={pdfStyles.footerLogoGap} />
          {logo}
        </>
      ) : (
        <>
          {logo}
          <View style={pdfStyles.footerLogoGap} />
          <Text>{pageText}</Text>
        </>
      )}
    </View>
  );
}

export function PdfRecommendationRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={pdfStyles.recommendationRow}>
      <Text style={pdfStyles.recommendationTitle}>{title}</Text>
      <Text style={pdfStyles.recommendationDesc}>{description}</Text>
    </View>
  );
}
