'use client';

import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { PLEXON_SURFACE_OFFWHITE_CSS } from '@/lib/plexon-surface-styles';
import { useI18n } from '@/components/i18n/I18nProvider';

const PHASE_LABELS: Record<string, string> = {
  planning: 'assistant.phasePlanning',
  retrieval: 'assistant.phaseRetrieval',
  executing: 'assistant.phaseExecuting',
  tools: 'assistant.phaseTools',
  workflow: 'assistant.phaseWorkflow',
  done: 'assistant.phaseDone',
};

type AgentPhaseIndicatorProps = {
  phase: string | null;
  detail?: string | null;
};

export function AgentPhaseIndicator({ phase, detail }: AgentPhaseIndicatorProps) {
  const { t } = useI18n();
  if (!phase || phase === 'done') return null;

  const labelKey = PHASE_LABELS[phase] ?? 'assistant.thinking';
  return (
    <Box
      data-msqdx-surface="light"
      sx={{
        px: 1.5,
        py: 1,
        mb: 1,
        borderRadius: '32px',
        border: '1px dashed var(--color-secondary-dx-grey-light-tint)',
        bgcolor: PLEXON_SURFACE_OFFWHITE_CSS,
      }}
    >
      <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
        {t(labelKey)}
        {detail ? ` — ${detail}` : ''}
      </MsqdxTypography>
    </Box>
  );
}
