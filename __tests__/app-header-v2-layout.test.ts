import { describe, expect, it } from 'vitest';
import {
  APP_HEADER_LOGO_INSET_PX,
  APP_HEADER_V2_BAR_CLASS,
  APP_HEADER_V2_CARD_CLASS,
  APP_HEADER_V2_CONTENT_PADDING_TOP,
  APP_HEADER_V2_MOBILE_MAX_WIDTH_PX,
  APP_HEADER_V2_PAGE_TITLE_LABEL_CLASS,
} from '@/lib/layout/app-header-v2-layout';

describe('app-header-v2-layout', () => {
  it('matches AUDION logo inset for MsqdxAppLayout alignment', () => {
    expect(APP_HEADER_LOGO_INSET_PX).toBe(230);
  });

  it('uses AUDION v2 CSS class hooks', () => {
    expect(APP_HEADER_V2_BAR_CLASS).toBe('msqdx-glass-admin-header-bar--v2-card');
    expect(APP_HEADER_V2_CARD_CLASS).toBe('msqdx-glass-admin-header-card');
    expect(APP_HEADER_V2_PAGE_TITLE_LABEL_CLASS).toBe('msqdx-glass-admin-header-page-title__label');
  });

  it('uses md breakpoint for mobile header', () => {
    expect(APP_HEADER_V2_MOBILE_MAX_WIDTH_PX).toBe(899);
  });

  it('defines absolute main padding like AUDION v2', () => {
    expect(APP_HEADER_V2_CONTENT_PADDING_TOP).toContain('55px');
    expect(APP_HEADER_V2_CONTENT_PADDING_TOP).toContain('--msqdx-spacing-md');
  });
});
