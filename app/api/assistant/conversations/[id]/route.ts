import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  deleteAssistantConversation,
  getAssistantConversationById,
  updateAssistantConversation,
} from '@/lib/db/assistant-conversations';

async function getOwnedConversation(request: Request, id: string) {
  const user = await getRequestUser(request);
  if (!user) return { error: apiError('Unauthorized', API_STATUS.UNAUTHORIZED) as Response };
  if (!process.env.DATABASE_URL) {
    return { error: apiError('Database not configured', 503) as Response };
  }

  const conversation = await getAssistantConversationById(id);
  if (!conversation || conversation.userId !== user.id) {
    return { error: apiError('Not found', API_STATUS.NOT_FOUND) as Response };
  }

  return { user, conversation };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await getOwnedConversation(request, id);
  if ('error' in result) return result.error;
  return Response.json(result.conversation);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await getOwnedConversation(request, id);
  if ('error' in result) return result.error;

  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  if (body.title !== undefined && typeof body.title !== 'string') {
    return apiError('title must be a string', API_STATUS.BAD_REQUEST);
  }

  await updateAssistantConversation(id, {
    ...(body.title !== undefined ? { title: body.title } : {}),
  });

  const updated = await getAssistantConversationById(id);
  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await getOwnedConversation(request, id);
  if ('error' in result) return result.error;

  await deleteAssistantConversation(id);
  return new Response(null, { status: 204 });
}
