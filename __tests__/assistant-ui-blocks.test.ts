import { describe, expect, it } from 'vitest';
import { encodeAssistantSseEvent } from '@/lib/assistant/assistant-sse';
import { parseUiLayoutFromMetadata } from '@/lib/assistant/ui-blocks/parse-metadata';
import { uiLayoutToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';

describe('assistant ui sse + metadata', () => {
  it('encodes ui_block events', () => {
    const encoded = encodeAssistantSseEvent({
      type: 'ui_block',
      index: 0,
      block: {
        id: 'b1',
        type: 'alert',
        props: { message: 'Hi' },
      },
    });
    expect(encoded).toContain('event: ui_block');
    expect(encoded).toContain('"type":"ui_block"');
  });

  it('parses uiLayout from message metadata', () => {
    const layout = parseUiLayoutFromMetadata({
      uiLayout: {
        version: 1,
        blocks: [
          {
            id: 'x',
            type: 'key_value_list',
            props: { items: [{ label: 'A', value: 1 }] },
          },
        ],
      },
    });
    expect(layout?.blocks).toHaveLength(1);
    expect(layout?.blocks[0].type).toBe('key_value_list');
  });

  it('converts layout to plain text', () => {
    const text = uiLayoutToPlainText({
      version: 1,
      blocks: [
        {
          id: '1',
          type: 'metric_grid',
          props: { items: [{ label: 'Score', value: 90 }] },
        },
      ],
    });
    expect(text).toContain('Score: 90');
  });
});
