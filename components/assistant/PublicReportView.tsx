'use client';

import { Box, Stack } from '@mui/material';
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { MsqdxTypography } from '@msqdx/react';
import { apiPublicReportPdf, apiPublicReportPptx } from '@/lib/constants';
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton';
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton';
import { useI18n } from '@/components/i18n/I18nProvider';

type PublicReportViewProps = {
  title: string;
  shareToken?: string;
  uiLayout: UiLayout;
};

export function PublicReportView({ title, shareToken, uiLayout }: PublicReportViewProps) {
  const { t } = useI18n();
  const pdfUrl = shareToken ? apiPublicReportPdf(shareToken) : null;
  const pptxUrl = shareToken ? apiPublicReportPptx(shareToken) : null;

  return (
    <Box
      data-plexon-assistant-ui
      sx={{
        maxWidth: 900,
        mx: 'auto',
        px: { xs: 2, md: 3 },
        py: 4,
        color: 'var(--color-text-on-light)',
        bgcolor: 'var(--color-bg-subtle)',
        minHeight: '100vh',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <MsqdxTypography variant="h4" sx={{ fontWeight: 800 }}>
          {title}
        </MsqdxTypography>
        {pdfUrl && pptxUrl ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <ReportPdfDownloadButton pdfUrl={pdfUrl} label={t('assistant.report.downloadPdf')} />
            <ReportBinaryDownloadButton
              downloadUrl={pptxUrl}
              label={t('assistant.report.downloadPptx')}
              format="pptx"
              loadingLabel={t('assistant.report.exportingPptx')}
            />
          </Stack>
        ) : null}
      </Stack>
      <AssistantMessageBlocks blocks={uiLayout.blocks} inset={false} />
    </Box>
  );
}
