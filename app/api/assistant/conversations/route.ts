import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import {
  createAssistantConversation,
  getAssistantConversationById,
  listAssistantConversationsForUser,
} from '@/lib/db/assistant-conversations';

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const items = await listAssistantConversationsForUser(user.id);
  return Response.json({ items });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: { title?: unknown; platformProjectId?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const title = typeof body.title === 'string' ? body.title.trim() : null;
  const platformProjectId =
    typeof body.platformProjectId === 'string' ? body.platformProjectId.trim() : null;

  const row = await createAssistantConversation({
    id: randomUUID(),
    userId: user.id,
    title,
    platformProjectId,
  });
  return Response.json(row, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: { id?: unknown; title?: unknown; platformProjectId?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return apiError('id is required', API_STATUS.BAD_REQUEST);

  const conversation = await getAssistantConversationById(id);
  if (!conversation || conversation.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  const { updateAssistantConversation } = await import('@/lib/db/assistant-conversations');
  await updateAssistantConversation(id, {
    ...(body.title !== undefined
      ? { title: typeof body.title === 'string' ? body.title : null }
      : {}),
    ...(body.platformProjectId !== undefined
      ? {
          platformProjectId:
            typeof body.platformProjectId === 'string' ? body.platformProjectId : null,
        }
      : {}),
  });

  const updated = await getAssistantConversationById(id);
  return Response.json(updated);
}
