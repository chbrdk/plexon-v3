'use client';

import { Box, Chip, Tooltip } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { assistantSuggestionChipSx } from '@/lib/assistant/chat-composer-styles';
import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';

type AssistantFollowUpChipsProps = {
  prompts: ConversationRecommendation[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
};

/** Auto-recommendations to continue the conversation — one click sends the prompt. */
export function AssistantFollowUpChips({
  prompts,
  disabled,
  onSelect,
}: AssistantFollowUpChipsProps) {
  if (!prompts.length) return null;

  return (
    <Box
      sx={{
        mt: `${MSQDX_SPACING.scale.sm}px`,
        pt: `${MSQDX_SPACING.scale.sm}px`,
        borderTop: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
      }}
    >
      <MsqdxTypography
        variant="caption"
        sx={{
          display: 'block',
          mb: `${MSQDX_SPACING.gap.xs}px`,
          fontWeight: 600,
          color: 'var(--color-text-muted, #64748b)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: '0.68rem',
        }}
      >
        Als Nächstes empfohlen
      </MsqdxTypography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: `${MSQDX_SPACING.gap.xs}px`,
        }}
      >
        {prompts.map((item) => {
          const chip = (
            <Chip
              key={item.id}
              size="small"
              label={item.label}
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              sx={{
                ...assistantSuggestionChipSx,
                cursor: disabled ? 'default' : 'pointer',
              }}
              variant="outlined"
            />
          );
          return item.reason ? (
            <Tooltip key={item.id} title={item.reason} arrow>
              {chip}
            </Tooltip>
          ) : (
            chip
          );
        })}
      </Box>
    </Box>
  );
}
