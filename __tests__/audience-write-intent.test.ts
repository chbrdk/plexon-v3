import { describe, expect, it } from 'vitest';
import {
  buildPlanningPromptFromConversation,
  hasAudienceWriteIntent,
} from '@/lib/assistant/audience-write-intent';
import { classifyToolFamily } from '@/lib/assistant/tool-catalog';

describe('audience-write-intent', () => {
  it('detects cross-product target group creation', () => {
    const prompt =
      'rheinland projekt aus checkion angucken und zielgruppen für audion ableiten und anlegen';
    expect(hasAudienceWriteIntent(prompt)).toBe(true);
  });

  it('keeps write intent in follow-up via planning prompt', () => {
    const planning = buildPlanningPromptFromConversation(
      [
        {
          role: 'user',
          content:
            'zielgruppen aus checkion für audion ableiten und anlegen rheinland versicherungen',
        },
        { role: 'assistant', content: 'hier sind 3 vorschläge' },
      ],
      'ja bitte leg sie an'
    );
    expect(hasAudienceWriteIntent(planning)).toBe(true);
  });

  it('classifies target_group_create as audion_audience_write', () => {
    expect(classifyToolFamily('audion_target_group_create')).toBe('audion_audience_write');
    expect(classifyToolFamily('audion_target_groups_list')).toBe('audion_knowledge');
  });
});
