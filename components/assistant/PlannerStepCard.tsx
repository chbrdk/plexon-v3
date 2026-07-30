'use client';

import { useState } from 'react';
import { Box, Collapse } from '@mui/material';
import { MsqdxButton, MsqdxCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';
import { useI18n } from '@/components/i18n/I18nProvider';

export type PlannerMetadata = {
  intent?: string;
  mode?: string;
  toolFamilies?: string[];
  maxToolRounds?: number;
  skipTools?: boolean;
  toolsOffered?: number;
  source?: string;
  reasoning?: string;
  retrievalHits?: number;
  retrievalVectorHits?: number;
  retrievalTerms?: string[];
};

const INTENT_I18N: Record<string, string> = {
  project_knowledge: 'assistant.plannerIntentKnowledge',
  checkion_scan: 'assistant.plannerIntentScan',
  checkion_seo_geo: 'assistant.plannerIntentGeo',
  audion_persona: 'assistant.plannerIntentPersona',
  audion_knowledge: 'assistant.plannerIntentKnowledge',
  action_write: 'assistant.plannerIntentAction',
  general_chat: 'assistant.plannerIntentGeneral',
};

const MODE_I18N: Record<string, string> = {
  embedded_context: 'assistant.plannerModeEmbedded',
  hybrid: 'assistant.plannerModeHybrid',
  tools: 'assistant.plannerModeTools',
};

type PlannerStepCardProps = {
  planner: PlannerMetadata;
};

export function PlannerStepCard({ planner }: PlannerStepCardProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const intentKey = planner.intent ? INTENT_I18N[planner.intent] : undefined;
  const modeKey = planner.mode ? MODE_I18N[planner.mode] : undefined;
  const intentLabel = intentKey ? t(intentKey) : planner.intent ?? '—';
  const modeLabel = modeKey ? t(modeKey) : planner.mode ?? '—';

  return (
    <MsqdxCard data-msqdx-surface="light" variant="flat" borderRadius="button" sx={plexonLightCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${MSQDX_SPACING.gap.sm}px`, flexWrap: 'wrap' }}>
        <MsqdxTypography
          variant="caption"
          sx={{
            fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
            fontWeight: MSQDX_TYPOGRAPHY.fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t('assistant.plannerTitle')}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ flex: 1 }}>
          {intentLabel} · {modeLabel}
          {typeof planner.toolsOffered === 'number' && planner.toolsOffered > 0
            ? ` · ${planner.toolsOffered} ${t('assistant.plannerTools')}`
            : ''}
          {typeof planner.retrievalHits === 'number' && planner.retrievalHits > 0
            ? ` · ${planner.retrievalHits} ${t('assistant.plannerSources')}`
            : ''}
          {typeof planner.retrievalVectorHits === 'number' && planner.retrievalVectorHits > 0
            ? ` · ${planner.retrievalVectorHits} vector`
            : ''}
        </MsqdxTypography>
        <MsqdxButton size="small" variant="text" onClick={() => setOpen((v) => !v)}>
          {open ? t('assistant.plannerHide') : t('assistant.plannerDetails')}
        </MsqdxButton>
      </Box>
      <Collapse in={open}>
        <Box
          sx={{
            pt: `${MSQDX_SPACING.scale.sm}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${MSQDX_SPACING.gap.xxs}px`,
          }}
        >
          {planner.reasoning && (
            <MsqdxTypography variant="body2" color="text.secondary">
              {planner.reasoning}
            </MsqdxTypography>
          )}
          {planner.toolFamilies && planner.toolFamilies.length > 0 && (
            <MsqdxTypography variant="caption" color="text.secondary">
              {t('assistant.plannerFamilies')}: {planner.toolFamilies.join(', ')}
            </MsqdxTypography>
          )}
          {planner.retrievalTerms && planner.retrievalTerms.length > 0 && (
            <MsqdxTypography variant="caption" color="text.secondary">
              {t('assistant.plannerSearchTerms')}: {planner.retrievalTerms.join(', ')}
            </MsqdxTypography>
          )}
          {planner.source && (
            <MsqdxTypography variant="caption" color="text.secondary">
              {t('assistant.plannerSource')}: {planner.source}
            </MsqdxTypography>
          )}
        </Box>
      </Collapse>
    </MsqdxCard>
  );
}
