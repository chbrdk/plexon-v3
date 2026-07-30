import { describe, expect, it } from 'vitest';
import { personaCardGridTemplate } from '@/components/assistant-ui/organisms/UiPersonaCardBlock';

describe('UiPersonaCardBlock layout', () => {
  it('uses full width grid for event quick check persona', () => {
    expect(personaCardGridTemplate(true)).toBe('1fr');
  });

  it('keeps responsive multi-column grid by default', () => {
    expect(personaCardGridTemplate(false)).toContain('minmax(280px');
  });
});
