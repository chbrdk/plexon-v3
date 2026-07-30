import { describe, expect, it } from 'vitest';
import { assistantChatMessagesStackSx } from '@/lib/assistant/chat-layout';

describe('chat-layout', () => {
  it('uses full width for the message stack', () => {
    expect(assistantChatMessagesStackSx).toMatchObject({
      width: '100%',
      maxWidth: '100%',
    });
  });
});
