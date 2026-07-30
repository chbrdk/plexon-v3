import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getAssistantConversationById } from '@/lib/db/assistant-conversations';
import {
  createReportPin,
  deleteReportPin,
  getReportPinById,
  listReportPinsForConversation,
  nextReportPinSortOrder,
} from '@/lib/db/assistant-report-pins';
import { getAssistantMessageById } from '@/lib/db/assistant-messages';
import { findBlockInMessage, isUiBlockPinnable } from '@/lib/assistant/reports/pin-eligibility';
import { randomUUID } from 'crypto';

async function assertConversationAccess(conversationId: string, userId: string) {
  const conversation = await getAssistantConversationById(conversationId);
  if (!conversation || conversation.userId !== userId) {
    return null;
  }
  return conversation;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const conversation = await assertConversationAccess(id, user.id);
  if (!conversation) return apiError('Not found', API_STATUS.NOT_FOUND);

  const items = await listReportPinsForConversation(id);
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
  const conversation = await assertConversationAccess(id, user.id);
  if (!conversation) return apiError('Not found', API_STATUS.NOT_FOUND);

  let body: { messageId?: unknown; blockId?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : '';
  const blockId = typeof body.blockId === 'string' ? body.blockId.trim() : '';
  if (!messageId || !blockId) {
    return apiError('messageId and blockId are required', API_STATUS.BAD_REQUEST);
  }

  const message = await getAssistantMessageById(messageId);
  if (!message || message.conversationId !== id) {
    return apiError('Message not found', API_STATUS.NOT_FOUND);
  }

  const block = findBlockInMessage(message.metadata, blockId);
  if (!block) {
    return apiError('Block not found in message', API_STATUS.NOT_FOUND);
  }

  const streaming = Boolean((message.metadata as { streaming?: boolean } | undefined)?.streaming);
  const eligibility = isUiBlockPinnable(block, { streaming });
  if (!eligibility.pinnable) {
    return apiError(`Block cannot be pinned: ${eligibility.reason}`, API_STATUS.BAD_REQUEST);
  }

  const existing = (await listReportPinsForConversation(id)).find(
    (p) => p.messageId === messageId && p.blockId === blockId
  );
  if (existing) {
    return Response.json(existing);
  }

  const sortOrder = await nextReportPinSortOrder(id);
  const pin = await createReportPin({
    id: randomUUID(),
    conversationId: id,
    userId: user.id,
    messageId,
    blockId,
    blockSnapshot: structuredClone(block),
    sortOrder,
  });

  return Response.json(pin, { status: 201 });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const conversation = await assertConversationAccess(id, user.id);
  if (!conversation) return apiError('Not found', API_STATUS.NOT_FOUND);

  const url = new URL(request.url);
  const pinId = url.searchParams.get('pinId')?.trim() ?? '';
  if (!pinId) return apiError('pinId query param is required', API_STATUS.BAD_REQUEST);

  const pin = await getReportPinById(pinId);
  if (!pin || pin.conversationId !== id || pin.userId !== user.id) {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }

  await deleteReportPin(pinId);
  return Response.json({ ok: true });
}
