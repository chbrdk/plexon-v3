'use client';

import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { EventQuickCheckReportCitationQueryRun } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { formatGeoLlmAnswerForDisplay } from '@/lib/integrations/format-geo-llm-answer';
import { PLEXON_META_CHIP_SX } from '@/lib/theme-accent';

type Props = {
  open: boolean;
  onClose: () => void;
  run: EventQuickCheckReportCitationQueryRun | null;
  modelLabel?: string;
};

export function EventQuickCheckLlmAnswerDialog({ open, onClose, run, modelLabel }: Props) {
  if (!run) return null;

  const answerText = formatGeoLlmAnswerForDisplay(run);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="event-quick-check-llm-answer-dialog-title"
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-on-light)',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle id="event-quick-check-llm-answer-dialog-title" sx={{ pr: 6 }}>
        <Stack spacing={0.5}>
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 600 }}>
            {EQC_REPORT_COPY.geoLlmAnswerDialogTitle}
          </Typography>
          {modelLabel ? (
            <Chip
              size="small"
              label={modelLabel}
              sx={{ ...PLEXON_META_CHIP_SX, alignSelf: 'flex-start' }}
            />
          ) : null}
        </Stack>
        <IconButton
          aria-label="Schließen"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <MsqdxIcon name="close" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={`${MSQDX_SPACING.scale.md}px`}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {EQC_REPORT_COPY.colQuery}
            </Typography>
            <Typography variant="body2">{run.query}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              {EQC_REPORT_COPY.geoLlmAnswerExcerpt}
            </Typography>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                m: 0,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'var(--color-card-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              {answerText || EQC_REPORT_COPY.geoLlmAnswerMissing}
            </Typography>
          </Stack>

          {run.citations.length > 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {EQC_REPORT_COPY.geoLlmAnswerCitations}
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                {run.citations.map((citation, index) => (
                  <Typography key={`${citation.domain}-${citation.position}-${index}`} component="li" variant="body2">
                    {citation.position}. {citation.domain}
                    {citation.context ? ` — ${citation.context}` : ''}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
