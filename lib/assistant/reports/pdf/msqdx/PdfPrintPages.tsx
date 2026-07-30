import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import {
  pdfContentMarginsForSide,
  pdfSpreadSideFromIndex,
  PDF_DOCUMENT_PAGE_LAYOUT,
  PDF_PAGE_BACKGROUND,
  PDF_PAGE_HEIGHT_PT,
  PDF_PAGE_WIDTH_PT,
  type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfStyles } from '@/lib/assistant/reports/pdf/msqdx/pdf-styles';
import { PdfMinimalPageChrome } from '@/lib/assistant/reports/pdf/msqdx/PdfAppFrame';
import {
  PdfContentColumn,
  PdfFooter,
} from '@/lib/assistant/reports/pdf/msqdx/PdfPrimitives';

const printPageBase = {
  width: PDF_PAGE_WIDTH_PT,
  height: PDF_PAGE_HEIGHT_PT,
  fontFamily: pdfStyles.page.fontFamily,
  fontSize: 10,
  backgroundColor: PDF_PAGE_BACKGROUND,
};

function PdfPageShell({
  side,
  children,
  footer,
}: {
  side: PdfSpreadSide;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const margins = pdfContentMarginsForSide(side);
  return (
    <Page
      size="A4"
      style={[
        printPageBase,
        {
          paddingTop: margins.paddingTop,
          paddingBottom: margins.paddingBottom,
          paddingLeft: margins.paddingLeft,
          paddingRight: margins.paddingRight,
          position: 'relative',
        },
      ]}
    >
      <PdfMinimalPageChrome side={side} />
      <View style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        <PdfContentColumn>{children}</PdfContentColumn>
      </View>
      {footer}
    </Page>
  );
}

export function PdfCoverPage({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <PdfPageShell side="cover" footer={footer}>
      {children}
    </PdfPageShell>
  );
}

export function PdfContentPage({
  side,
  children,
  footer,
}: {
  side: PdfSpreadSide;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <PdfPageShell side={side} footer={footer}>
      {children}
    </PdfPageShell>
  );
}

export function PdfStatGrid({
  items,
}: {
  items: Array<{ label: string; value: string; accent?: string }>;
}) {
  return (
    <View style={pdfStyles.statGrid}>
      {items.map((item) => (
        <View key={item.label} style={pdfStyles.statTile}>
          <Text style={pdfStyles.statTileLabel}>{item.label}</Text>
          <Text style={pdfStyles.statTileValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function PdfDataTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string; width?: string | number }>;
  rows: Array<Record<string, string>>;
}) {
  return (
    <View style={pdfStyles.contentPanel}>
      <View style={pdfStyles.dataTableHeader}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[pdfStyles.dataTableHeaderCell, { width: col.width ?? '25%' }]}
          >
            {col.label}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={pdfStyles.dataTableRow}>
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[pdfStyles.tableValue, { width: col.width ?? '25%', fontSize: 9 }]}
            >
              {row[col.key] ?? '–'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function PdfLeadText({ children }: { children: string }) {
  const chunks = children.split(/\n\n+/).filter(Boolean);
  return (
    <>
      {chunks.map((chunk, i) => (
        <Text key={i} style={pdfStyles.leadText}>
          {chunk.trim()}
        </Text>
      ))}
    </>
  );
}

export function applyReportFooters(
  pages: React.ReactElement[],
  options: {
    title: string;
    locale: 'de' | 'en';
    skipFooter?: (page: React.ReactElement, index: number) => boolean;
  }
): React.ReactElement[] {
  const total = pages.length;
  return pages.map((page, index) => {
    if (options.skipFooter?.(page, index)) return page;
    const footer = (
      <PdfFooter
        key="report-footer"
        pageNumber={index + 1}
        totalPages={total}
        locale={options.locale}
        spreadSide={pdfSpreadSideFromIndex(index)}
      />
    );
    return React.cloneElement(page, { footer } as { footer: React.ReactNode });
  });
}

export function contentSideForIndex(index: number): PdfSpreadSide {
  return pdfSpreadSideFromIndex(index);
}

export { PDF_DOCUMENT_PAGE_LAYOUT };
