import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAssistantConversationById } from '@/lib/db/assistant-conversations';
import { listSharedReportsForConversation } from '@/lib/db/assistant-shared-reports';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const conversation = await getAssistantConversationById(id);
  if (!conversation || conversation.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const items = await listSharedReportsForConversation(id);
  return Response.json({
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      isPublic: r.isPublic,
    })),
  });
}
