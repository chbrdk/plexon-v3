'use client';

import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { pathCheckionProject } from '@/lib/paths/checkion-api';
import { THEME_ACCENT_OUTLINED_BUTTON_SX } from '@/lib/theme-accent';
import { useEventQuickCheckDeepScanPoll } from '@/components/event-quick-check/use-event-quick-check-deep-scan-poll';

type Props = {
  workflowRunId: string;
  initialProgress?: DeepScanProgress;
  checkionProjectId?: string;
};

export function EventQuickCheckDeepScanBanner({
  workflowRunId,
  initialProgress,
  checkionProjectId: initialCheckionProjectId,
}: Props) {
  const { progress, allComplete, checkionProjectId, loading } = useEventQuickCheckDeepScanPoll(
    workflowRunId,
    {
      enabled: true,
      initialProgress,
      initialCheckionProjectId,
    }
  );

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.complete / progress.total) * 100)
      : 0;
  const projectId = checkionProjectId ?? initialCheckionProjectId;

  return (
    <Alert
      severity={allComplete ? 'success' : 'info'}
      sx={{ mb: 2 }}
      icon={false}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {allComplete
              ? EQC_PAGE_COPY.deepScanBannerCompleteTitle
              : EQC_PAGE_COPY.deepScanBannerTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {allComplete
              ? EQC_PAGE_COPY.deepScanBannerCompleteLead
              : EQC_PAGE_COPY.deepScanBannerLead}
          </Typography>
        </Box>
        {!allComplete ? (
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {loading && !progress
                  ? EQC_PAGE_COPY.deepScanWaitingProgressUnknown
                  : (progress?.detail ?? EQC_PAGE_COPY.deepScanWaitingProgressUnknown)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pct}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={pct} />
          </Box>
        ) : null}
        {projectId ? (
          <Box>
            <MsqdxButton
              variant="outlined"
              size="small"
              sx={THEME_ACCENT_OUTLINED_BUTTON_SX}
              onClick={() =>
                window.open(pathCheckionProject(projectId), '_blank', 'noopener,noreferrer')
              }
            >
              {EQC_PAGE_COPY.openCheckionProjectButton}
            </MsqdxButton>
          </Box>
        ) : null}
      </Stack>
    </Alert>
  );
}
