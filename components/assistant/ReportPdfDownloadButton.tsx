'use client';

import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton';

type ReportPdfDownloadButtonProps = {
  pdfUrl: string;
  label: string;
  errorLabel?: string;
  size?: 'small' | 'medium';
  sx?: Record<string, unknown>;
};

export function ReportPdfDownloadButton({
  pdfUrl,
  label,
  errorLabel = 'PDF-Export fehlgeschlagen',
  size = 'small',
  sx,
}: ReportPdfDownloadButtonProps) {
  return (
    <ReportBinaryDownloadButton
      downloadUrl={pdfUrl}
      label={label}
      format="pdf"
      errorLabel={errorLabel}
      size={size}
      sx={sx}
    />
  );
}
