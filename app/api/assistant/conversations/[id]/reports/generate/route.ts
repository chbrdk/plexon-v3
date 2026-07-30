import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAssistantConversationById } from '@/lib/db/assistant-conversations';
import { listReportPinsForConversation } from '@/lib/db/assistant-report-pins';
import { generateConversationReport } from '@/lib/assistant/reports/generate-conversation-report';
import { runtimeEnv } from '@/lib/runtime-env';

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const apiKey = runtimeEnv('ANTHROPIC_API_KEY');
  if (!apiKey) return apiError('ANTHROPIC_API_KEY not configured', 503);

  const { id } = await ctx.params;
  const conversation = await getAssistantConversationById(id);
  if (!conversation || conversation.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  let body: { title?: unknown; pinIds?: unknown };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const titleHint = typeof body.title === 'string' ? body.title.trim() : undefined;
  const pinIds = Array.isArray(body.pinIds)
    ? body.pinIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : null;

  let pins = await listReportPinsForConversation(id);
  if (pinIds && pinIds.length > 0) {
    const idSet = new Set(pinIds);
    pins = pins.filter((p) => idSet.has(p.id));
  }

  if (pins.length === 0) {
    return apiError('No pinned blocks to generate report', API_STATUS.BAD_REQUEST);
  }

  const result = await generateConversationReport({
    conversationId: id,
    userId: user.id,
    pins,
    titleHint,
    conversationTitle: conversation.title,
    anthropicApiKey: apiKey,
  });

  const origin = new URL(request.url).origin;
  const shareUrl = `${origin}${result.sharePath}`;

  return Response.json({
    reportId: result.reportId,
    title: result.title,
    narrative: result.narrative,
    uiLayout: result.uiLayout,
    sharePath: result.sharePath,
    shareUrl,
    shareToken: result.shareToken,
  });
}
