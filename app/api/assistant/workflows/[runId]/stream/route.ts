import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import {
  buildWorkflowStreamPayload,
  emitWorkflowStreamEvents,
} from '@/lib/assistant/workflow-stream';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { runId } = await ctx.params;
  const run = await getAssistantWorkflowRunById(runId);
  if (!run) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }
  const allowed =
    run.type === 'event_quick_check'
      ? await userCanAccessEventQuickCheckRun(user, run)
      : run.userId === user.id;
  if (!allowed) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const deadline = Date.now() + 5 * 60 * 1000;
      while (!closed && Date.now() < deadline) {
        const payload = await buildWorkflowStreamPayload(runId);
        if (!payload) break;

        await emitWorkflowStreamEvents(send, payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      controller.close();
      closed = true;
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
