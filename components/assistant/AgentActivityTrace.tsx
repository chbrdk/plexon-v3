'use client';

import { useEffect, useState } from 'react';
import { Box, Collapse, LinearProgress } from '@mui/material';
import { MsqdxButton, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { PLEXON_SURFACE_OFFWHITE_CSS } from '@/lib/plexon-surface-styles';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PlannerStepCard, type PlannerMetadata } from '@/components/assistant/PlannerStepCard';

export type AgentToolTraceItem = {
  id: string;
  name: string;
  status: 'running' | 'done';
  preview?: string;
};

export type AgentActivityTraceState = {
  phase: string | null;
  phaseDetail?: string | null;
  plan: PlannerMetadata | null;
  retrievalHits?: number;
  retrievalVectorHits?: number;
  retrievalTerms?: string[];
  thinking: string;
  thinkingLive: boolean;
  tools: AgentToolTraceItem[];
};

const PHASE_LABELS: Record<string, string> = {
  planning: 'assistant.phasePlanning',
  retrieval: 'assistant.phaseRetrieval',
  executing: 'assistant.phaseExecuting',
  tools: 'assistant.phaseTools',
  workflow: 'assistant.phaseWorkflow',
  done: 'assistant.phaseDone',
};

type AgentActivityTraceProps = {
  trace: AgentActivityTraceState;
  active: boolean;
};

export function AgentActivityTrace({ trace, active }: AgentActivityTraceProps) {
  const { t } = useI18n();
  const [thinkingOpen, setThinkingOpen] = useState(true);

  useEffect(() => {
    if (!trace.thinkingLive && trace.thinking.length > 0) {
      setThinkingOpen(false);
    }
  }, [trace.thinkingLive, trace.thinking.length]);

  if (!active) return null;

  const phaseKey = trace.phase ? PHASE_LABELS[trace.phase] : undefined;
  const phaseLabel = phaseKey ? t(phaseKey) : t('assistant.thinking');
  const showThinkingPanel = trace.thinking.length > 0;

  const plannerForCard: PlannerMetadata | null = trace.plan
    ? {
        ...trace.plan,
        retrievalHits: trace.retrievalHits,
        retrievalVectorHits: trace.retrievalVectorHits,
        retrievalTerms: trace.retrievalTerms,
      }
    : null;

  return (
    <Box
      data-msqdx-surface="light"
      sx={{
        mb: 1.5,
        maxHeight: 280,
        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
        borderRadius: '32px',
        bgcolor: PLEXON_SURFACE_OFFWHITE_CSS,
        color: 'var(--color-text-on-light)',
        overflow: 'auto',
      }}
    >
      <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {t('assistant.activityTitle')}
          </MsqdxTypography>
          {trace.phase && trace.phase !== 'done' && <LinearProgress sx={{ flex: 1, height: 4, borderRadius: 1 }} />}
        </Box>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {phaseLabel}
          {trace.phaseDetail ? ` — ${trace.phaseDetail}` : ''}
        </MsqdxTypography>
      </Box>

      {plannerForCard?.intent && (
        <Box sx={{ px: 1.5, pt: 1 }}>
          <PlannerStepCard planner={plannerForCard} />
        </Box>
      )}

      {typeof trace.retrievalHits === 'number' && trace.retrievalHits > 0 && (
        <Box sx={{ px: 1.5, py: 0.75 }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
            {t('assistant.activityRetrieval', {
              hits: String(trace.retrievalHits),
              vector: trace.retrievalVectorHits ? ` · ${trace.retrievalVectorHits} vector` : '',
            })}
            {trace.retrievalTerms?.length ? ` — ${trace.retrievalTerms.join(', ')}` : ''}
          </MsqdxTypography>
        </Box>
      )}

      {trace.tools.length > 0 && (
        <Box sx={{ px: 1.5, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {trace.tools.map((tool) => (
            <Box
              key={tool.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                py: 0.5,
                px: 1,
                borderRadius: 'var(--msqdx-radius-xs)',
                bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
              }}
            >
              <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                {tool.status === 'running' ? '⏳' : '✓'} {tool.name}
                {tool.status === 'running' ? ` — ${t('assistant.toolRunning')}` : ` — ${t('assistant.toolDone')}`}
              </MsqdxTypography>
              {tool.preview && tool.status === 'done' && (
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {tool.preview}
                </MsqdxTypography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {showThinkingPanel && (
        <Box sx={{ px: 1.5, py: 1, borderTop: '1px dashed var(--color-secondary-dx-grey-light-tint)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <MsqdxTypography variant="caption" sx={{ fontWeight: 700 }}>
              {t('assistant.thinkingTitle')}
              {trace.thinkingLive ? ` (${t('assistant.thinkingLive')})` : ''}
            </MsqdxTypography>
            {!trace.thinkingLive && (
              <MsqdxButton size="small" variant="text" onClick={() => setThinkingOpen((v) => !v)}>
                {thinkingOpen ? t('assistant.thinkingHide') : t('assistant.thinkingShow')}
              </MsqdxButton>
            )}
          </Box>
          <Collapse in={thinkingOpen}>
            <Box
              sx={{
                maxHeight: trace.thinkingLive ? 200 : 120,
                overflow: 'auto',
                p: 1,
                borderRadius: 'var(--msqdx-radius-xs)',
                bgcolor: 'rgba(0,0,0,0.03)',
              }}
            >
              <MsqdxTypography
                variant="caption"
                component="pre"
                sx={{
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  color: 'var(--color-text-muted-on-light)',
                }}
              >
                {trace.thinking}
              </MsqdxTypography>
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

export const emptyAgentActivityTrace = (): AgentActivityTraceState => ({
  phase: null,
  phaseDetail: null,
  plan: null,
  thinking: '',
  thinkingLive: false,
  tools: [],
});
