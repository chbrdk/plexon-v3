'use client';

import { useRouter } from 'next/navigation';
import { Box, Chip, CircularProgress, IconButton, useTheme } from '@mui/material';
import { MsqdxIcon, MsqdxInput } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  buildAssistantSuggestedPrompts,
  ASSISTANT_SUGGESTION_LABELS_DE,
  ASSISTANT_SUGGESTION_LABELS_EN,
} from '@/lib/assistant/suggested-prompts';
import {
  assistantChatComposerBarSx,
  assistantChatComposerInputSx,
  assistantChatComposerPillSx,
  assistantChatSendButtonSx,
  assistantSuggestionChipSx,
} from '@/lib/assistant/chat-composer-styles';

type AssistantChatComposerProps = {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestion?: (prompt: string) => void;
  /** Resolved from conversation first, project domain as fallback. */
  targetUrl?: string | null;
  projectName?: string | null;
};

/** AUDION-style fused pill composer (no blur) + round green send. */
export function AssistantChatComposer({
  value,
  loading,
  onChange,
  onSubmit,
  onSuggestion,
  targetUrl,
  projectName,
}: AssistantChatComposerProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const theme = useTheme();
  const sendDisabled = loading || !value.trim();

  const labelFor = (key: string) => {
    const map = locale === 'de' ? ASSISTANT_SUGGESTION_LABELS_DE : ASSISTANT_SUGGESTION_LABELS_EN;
    return map[key] ?? key;
  };

  const suggestedPrompts = buildAssistantSuggestedPrompts({
    domain: targetUrl,
    projectName,
  });

  return (
    <Box
      component="form"
      data-plexon-assistant-chat
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      sx={assistantChatComposerBarSx}
    >
      {onSuggestion ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: `${MSQDX_SPACING.gap.xs}px`,
            mb: `${MSQDX_SPACING.scale.xs}px`,
            width: '100%',
          }}
        >
          {suggestedPrompts.map((s) => (
            <Chip
              key={s.id}
              size="small"
              variant="outlined"
              label={labelFor(s.labelKey)}
              disabled={loading}
              onClick={() => {
                if (s.hrefPath) {
                  router.push(s.hrefPath);
                  return;
                }
                onSuggestion?.(s.prompt);
              }}
              sx={assistantSuggestionChipSx}
            />
          ))}
        </Box>
      ) : null}
      <Box sx={assistantChatComposerPillSx(theme)}>
        <MsqdxInput
          fullWidth
          placeholder={t('assistant.placeholder')}
          value={value}
          disabled={loading}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          size="large"
          sx={assistantChatComposerInputSx}
        />
        <IconButton
          type="submit"
          disabled={sendDisabled}
          aria-label={t('assistant.send')}
          sx={assistantChatSendButtonSx(theme, sendDisabled)}
        >
          {loading ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            <MsqdxIcon name="send" customSize={22} />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
