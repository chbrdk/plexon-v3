import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAssistantConversationById } from '@/lib/db/assistant-conversations';
import {
  createAssistantMessage,
  listAssistantMessagesForConversation,
} from '@/lib/db/assistant-messages';
import { randomUUID } from 'crypto';

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

  const items = await listAssistantMessagesForConversation(id);
  return Response.json({ items });
}

export async function POST(
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

  let body: { role?: unknown; content?: unknown; metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const role = body.role === 'user' || body.role === 'assistant' || body.role === 'system'
    ? body.role
    : null;
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!role || !content) {
    return apiError('role and content are required', API_STATUS.BAD_REQUEST);
  }

  const metadata =
    body.metadata !== undefined && body.metadata !== null && typeof body.metadata === 'object'
      ? (body.metadata as Record<string, unknown>)
      : null;

  const message = await createAssistantMessage({
    id: randomUUID(),
    conversationId: id,
    role,
    content,
    metadata,
  });

  const { updateAssistantConversation } = await import('@/lib/db/assistant-conversations');
  await updateAssistantConversation(id, {});

  return Response.json(message, { status: 201 });
}
