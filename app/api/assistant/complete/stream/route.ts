import { NextRequest } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  assistantSseResponse,
  createAssistantSseStream,
  type AssistantStreamEvent,
} from '@/lib/assistant/assistant-sse';
import {
  handleAssistantComplete,
  type AssistantCompleteBody,
} from '@/lib/assistant/complete-handler';

/** Creation scene-edit + preview can exceed default serverless limits. */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: AssistantCompleteBody;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const stream = createAssistantSseStream(async (emit) => {
    try {
      const result = await handleAssistantComplete(user, body, emit);
      emit({
        type: 'done',
        payload: {
          conversationId: result.conversationId,
          workflowRunId: result.workflowRunId,
          text: result.text,
          metadata: result.metadata,
          messageId: result.message.id,
        },
      });
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e);
      const status = (e as Error & { status?: number }).status;
      if (details.includes('Claude API error')) {
        emit({ type: 'error', message: 'Claude API request failed', details });
        return;
      }
      emit({
        type: 'error',
        message: status ? details : 'Assistant request failed',
        details,
      });
    }
  });

  return assistantSseResponse(stream);
}
