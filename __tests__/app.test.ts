import { describe, it, expect } from 'vitest';

describe('PLEXON app', () => {
  it('constants expose PATH_LOGIN and PATH_HOME', async () => {
    const { PATH_LOGIN, PATH_HOME } = await import('@/lib/constants');
    expect(PATH_LOGIN).toBe('/login');
    expect(PATH_HOME).toBe('/');
  });

  it('theme accent fallback is defined', async () => {
    const { THEME_ACCENT_WITH_FALLBACK, THEME_ACCENT_OUTLINED_BUTTON_SX } = await import(
      '@/lib/theme-accent'
    );
    expect(THEME_ACCENT_WITH_FALLBACK.backgroundColor).toBeDefined();
    expect(THEME_ACCENT_OUTLINED_BUTTON_SX.borderColor).toContain('--color-theme-accent');
  });
});
