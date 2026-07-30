'use client';

import { useEffect, useRef } from 'react';
import { Alert, Box, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { DeepScanProgress } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import { pathCheckionProject } from '@/lib/paths/checkion-api';
import { THEME_ACCENT_OUTLINED_BUTTON_SX } from '@/lib/theme-accent';
import { useEventQuickCheckDeepScanPoll } from '@/components/event-quick-check/use-event-quick-check-deep-scan-poll';

type Props = {
  workflowRunId: string;
  checkionProjectId?: string;
  initialProgress?: DeepScanProgress;
  loading: boolean;
  onContinue: () => void;
  onProgress: (progress: DeepScanProgress) => void;
};

export function EventQuickCheckDeepScanPanel({
  workflowRunId,
  checkionProjectId: initialCheckionProjectId,
  initialProgress,
  loading,
  onContinue,
  onProgress,
}: Props) {
  const continueTriggered = useRef(false);
  const { progress, allComplete, checkionProjectId } = useEventQuickCheckDeepScanPoll(workflowRunId, {
    initialProgress,
    initialCheckionProjectId,
  });

  useEffect(() => {
    if (progress) onProgress(progress);
  }, [progress, onProgress]);

  useEffect(() => {
    if (allComplete && !continueTriggered.current && !loading) {
      continueTriggered.current = true;
      onContinue();
    }
  }, [allComplete, loading, onContinue]);

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.complete / progress.total) * 100)
      : 0;
  const projectId = checkionProjectId ?? initialCheckionProjectId;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {EQC_PAGE_COPY.deepScanWaitingTitle}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {EQC_PAGE_COPY.deepScanWaitingLead}
      </Typography>
      <Alert severity="info">{EQC_PAGE_COPY.deepScanWaitingHint}</Alert>
      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {progress?.detail ?? EQC_PAGE_COPY.deepScanWaitingProgressUnknown}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pct}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={pct} />
      </Box>
      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">{EQC_PAGE_COPY.deepScanWaitingContinuing}</Typography>
        </Stack>
      ) : (
        <MsqdxButton
          variant="contained"
          onClick={onContinue}
          disabled={!progress || progress.complete < progress.total}
        >
          {EQC_PAGE_COPY.deepScanWaitingContinue}
        </MsqdxButton>
      )}
      {projectId ? (
        <MsqdxButton
          variant="outlined"
          sx={THEME_ACCENT_OUTLINED_BUTTON_SX}
          onClick={() =>
            window.open(pathCheckionProject(projectId), '_blank', 'noopener,noreferrer')
          }
        >
          {EQC_PAGE_COPY.openCheckionProjectButton}
        </MsqdxButton>
      ) : null}
    </Stack>
  );
}
