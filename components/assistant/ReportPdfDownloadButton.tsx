'use client'

import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'

type ReportPdfDownloadButtonProps = {
  pdfUrl: string
  label: string
  errorLabel?: string
  size?: 'sm' | 'md' | 'small' | 'medium'
}

export function ReportPdfDownloadButton({
  pdfUrl,
  label,
  errorLabel = 'PDF-Export fehlgeschlagen',
  size = 'sm',
}: ReportPdfDownloadButtonProps) {
  return (
    <ReportBinaryDownloadButton
      downloadUrl={pdfUrl}
      label={label}
      format="pdf"
      errorLabel={errorLabel}
      size={size}
    />
  )
}
