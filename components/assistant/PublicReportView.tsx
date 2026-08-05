'use client'

import { Text } from '@msqdx/ui'
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer'
import type { UiLayout } from '@/lib/assistant/ui-blocks/types'
import { apiPublicReportPdf, apiPublicReportPptx } from '@/lib/constants'
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton'
import { useI18n } from '@/components/i18n/I18nProvider'

type PublicReportViewProps = {
  title: string
  shareToken?: string
  uiLayout: UiLayout
}

export function PublicReportView({ title, shareToken, uiLayout }: PublicReportViewProps) {
  const { t } = useI18n()
  const pdfUrl = shareToken ? apiPublicReportPdf(shareToken) : null
  const pptxUrl = shareToken ? apiPublicReportPptx(shareToken) : null

  return (
    <div className="plexon-public-report" data-plexon-assistant-ui>
      <header className="plexon-public-report-header">
        <Text role="headline" as="h1">
          {title}
        </Text>
        {pdfUrl && pptxUrl ? (
          <div className="plexon-public-report-actions">
            <ReportPdfDownloadButton pdfUrl={pdfUrl} label={t('assistant.report.downloadPdf')} />
            <ReportBinaryDownloadButton
              downloadUrl={pptxUrl}
              label={t('assistant.report.downloadPptx')}
              format="pptx"
              loadingLabel={t('assistant.report.exportingPptx')}
            />
          </div>
        ) : null}
      </header>
      <AssistantMessageBlocks blocks={uiLayout.blocks} inset={false} />
    </div>
  )
}
