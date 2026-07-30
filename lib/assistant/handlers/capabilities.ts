import {
  ASSISTANT_MESSAGE_CONTENT_TYPE,
  getAssistantCapabilitiesFallbackText,
} from '@/lib/assistant/capabilities-overview';
import { buildCapabilitiesUiLayout } from '@/lib/assistant/capabilities-ui';
import {
  ASSISTANT_UI_SHOWCASE_INTRO,
  buildAssistantUiShowcaseLayout,
} from '@/lib/assistant/ui-blocks/build-ui-showcase';
import { emitPhase, type AssistantHandlerContext, type AssistantHandlerResult } from '@/lib/assistant/handlers/context';

export async function handleCapabilitiesIntent(ctx: AssistantHandlerContext): Promise<AssistantHandlerResult> {
  emitPhase(ctx.emit, 'workflow');
  return {
    assistantText: getAssistantCapabilitiesFallbackText(),
    metadata: {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
      capabilitiesOverview: true,
      uiLayout: buildCapabilitiesUiLayout(),
    },
  };
}

export async function handleUiShowcaseIntent(ctx: AssistantHandlerContext): Promise<AssistantHandlerResult> {
  emitPhase(ctx.emit, 'executing');
  return {
    assistantText: ASSISTANT_UI_SHOWCASE_INTRO,
    metadata: {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
      uiLayout: buildAssistantUiShowcaseLayout(),
    },
  };
}
