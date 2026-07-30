import type { Theme } from '@mui/material';
import { alpha } from '@mui/material';

/** Border + label colors — aligned with AUDION `MsqdxGlassChatPanel`. */
export const ASSISTANT_CHAT_BUBBLE_COLORS = {
  userBorder: 'var(--color-secondary-dx-orange)',
  assistantBorder: 'var(--color-secondary-dx-pink)',
  systemBorder: 'var(--color-secondary-dx-grey-light)',
  surface: 'var(--color-bg-subtle)',
} as const;

export type GlassChatRole = 'user' | 'assistant' | 'system';

/** Max bubble width per role — assistant uses 2/3 of the chat column. */
export const ASSISTANT_CHAT_BUBBLE_MAX_WIDTH: Record<
  GlassChatRole,
  { xs: string; md: string }
> = {
  user: { xs: '92%', md: '50%' },
  assistant: { xs: '100%', md: '66.67%' },
  system: { xs: '100%', md: '66.67%' },
};

export function getGlassChatBubbleMaxWidth(role: GlassChatRole) {
  return ASSISTANT_CHAT_BUBBLE_MAX_WIDTH[role];
}

export function getGlassChatBubbleAlign(
  role: GlassChatRole
): 'flex-start' | 'flex-end' {
  return role === 'user' ? 'flex-end' : 'flex-start';
}

export function getGlassChatLabelColor(role: GlassChatRole): string {
  if (role === 'user') return ASSISTANT_CHAT_BUBBLE_COLORS.userBorder;
  if (role === 'system') return ASSISTANT_CHAT_BUBBLE_COLORS.systemBorder;
  return ASSISTANT_CHAT_BUBBLE_COLORS.assistantBorder;
}

/** Core bubble surface styles (border, radius, background). */
export function getGlassChatBubbleSx(role: GlassChatRole, theme: Theme) {
  const isDark = theme.palette.mode === 'dark';
  const onLight = {
    background: ASSISTANT_CHAT_BUBBLE_COLORS.surface,
    color: 'var(--color-text-on-light)',
  };

  if (role === 'user') {
    return {
      alignSelf: 'flex-end' as const,
      ...onLight,
      border: `1px solid ${ASSISTANT_CHAT_BUBBLE_COLORS.userBorder}`,
      borderRadius: '36px 12px 36px 36px',
    };
  }

  if (role === 'system') {
    return {
      alignSelf: 'flex-start' as const,
      background: isDark
        ? alpha(ASSISTANT_CHAT_BUBBLE_COLORS.surface, 0.85)
        : alpha('#000000', 0.03),
      border: `1px solid ${ASSISTANT_CHAT_BUBBLE_COLORS.systemBorder}`,
      borderRadius: '16px 44px 44px 44px',
      color: theme.palette.text.primary,
    };
  }

  return {
    alignSelf: 'flex-start' as const,
    ...onLight,
    border: `1px solid ${ASSISTANT_CHAT_BUBBLE_COLORS.assistantBorder}`,
    borderRadius: '12px 44px 44px 44px',
  };
}
