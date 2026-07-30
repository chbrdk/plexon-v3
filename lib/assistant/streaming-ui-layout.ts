import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

/**
 * Upsert a UI block on the in-flight assistant message (SSE ui_block / ui_block_update).
 * Creates the streaming assistant row when it does not exist yet (workflows only emit updates).
 */
export function mergeStreamingUiBlockUpdate(
  messages: AssistantChatMessage[],
  streamId: string,
  block: UiBlock,
  extraMetadata?: Record<string, unknown>
): AssistantChatMessage[] {
  const existingMsg = messages.find((m) => m.id === streamId);

  if (!existingMsg) {
    return [
      ...messages,
      {
        id: streamId,
        role: 'assistant' as const,
        content: '',
        metadata: {
          contentType: 'ui_composed',
          streaming: true,
          uiLayout: { version: UI_LAYOUT_VERSION, blocks: [block] },
          ...extraMetadata,
        },
      },
    ];
  }

  return messages.map((m) => {
    if (m.id !== streamId) return m;
    const layout = (m.metadata?.uiLayout as { blocks?: UiBlock[] } | undefined) ?? { blocks: [] };
    const blocks = layout.blocks ?? [];
    const nextBlocks = blocks.some((b) => b.id === block.id)
      ? blocks.map((b) => (b.id === block.id ? block : b))
      : [...blocks, block];
    return {
      ...m,
      metadata: {
        ...m.metadata,
        ...extraMetadata,
        contentType: 'ui_composed',
        streaming: true,
        uiLayout: { version: UI_LAYOUT_VERSION, blocks: nextBlocks },
      },
    };
  });
}

export function patchStreamingMessageMetadata(
  messages: AssistantChatMessage[],
  streamId: string,
  patch: Record<string, unknown>
): AssistantChatMessage[] {
  const existing = messages.find((m) => m.id === streamId);
  if (!existing) {
    return [
      ...messages,
      {
        id: streamId,
        role: 'assistant' as const,
        content: '',
        metadata: {
          contentType: 'ui_composed',
          streaming: true,
          uiLayout: { version: UI_LAYOUT_VERSION, blocks: [] },
          ...patch,
        },
      },
    ];
  }
  return messages.map((m) =>
    m.id === streamId
      ? {
          ...m,
          metadata: {
            ...m.metadata,
            ...patch,
          },
        }
      : m
  );
}
