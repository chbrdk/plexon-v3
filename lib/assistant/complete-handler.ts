import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { RequestUser } from '@/lib/auth-request-user';
import { API_STATUS } from '@/lib/api-error-handler';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import {
  extractPendingDomainFromHistory,
  extractPendingProjectNameFromHistory,
} from '@/lib/assistant/conversation-context';
import type { AssistantStreamEvent, AssistantStreamPhase } from '@/lib/assistant/assistant-sse';
import { getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import {
  createAssistantConversation,
  getAssistantConversationById,
  updateAssistantConversation,
} from '@/lib/db/assistant-conversations';
import {
  createAssistantMessage,
  listAssistantMessagesForConversation,
} from '@/lib/db/assistant-messages';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import type { AssistantCompleteBody, AssistantCompleteResult } from '@/lib/assistant/complete-types';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';
import { dispatchAssistantIntent } from '@/lib/assistant/workflow-registry';
import { attachRecommendationsToMetadata } from '@/lib/assistant/insights/conversation-recommendations';
import { normalizeAssistantTargetUrl } from '@/lib/assistant/project-target-url';

export type { AssistantCompleteBody, AssistantCompleteResult } from '@/lib/assistant/complete-types';

async function loadUserProfile(userId: string): Promise<{ name: string | null; email: string }> {
  if (!process.env.DATABASE_URL) return { name: null, email: userId };
  const db = getDb();
  const [row] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { name: row?.name ?? null, email: row?.email ?? userId };
}

function emitPhase(
  emit: ((event: AssistantStreamEvent) => void) | undefined,
  phase: AssistantStreamPhase,
  detail?: string
) {
  emit?.({ type: 'phase', phase, detail });
}

export async function handleAssistantComplete(
  user: RequestUser,
  body: AssistantCompleteBody,
  emit?: (event: AssistantStreamEvent) => void
): Promise<AssistantCompleteResult> {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt && !body.confirmToolCall) {
    const err = new Error('Missing or empty prompt') as Error & { status?: number };
    err.status = API_STATUS.BAD_REQUEST;
    throw err;
  }

  let conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  let conversation = conversationId ? await getAssistantConversationById(conversationId) : null;
  if (conversation && conversation.userId !== user.id) {
    const err = new Error('Forbidden') as Error & { status?: number };
    err.status = API_STATUS.FORBIDDEN;
    throw err;
  }

  if (!conversation) {
    conversation = await createAssistantConversation({
      id: randomUUID(),
      userId: user.id,
      title: prompt.slice(0, 80) || 'Neuer Chat',
    });
    conversationId = conversation.id;
  }

  const platformProjectId =
    (typeof body.platformProjectId === 'string' ? body.platformProjectId.trim() : null) ||
    conversation.platformProjectId ||
    undefined;

  if (platformProjectId) {
    const allowed = await userCanViewPlatformProject(user.id, user.role, platformProjectId);
    if (!allowed) {
      const err = new Error('Forbidden project context') as Error & { status?: number };
      err.status = API_STATUS.FORBIDDEN;
      throw err;
    }
    if (conversation.platformProjectId !== platformProjectId) {
      await updateAssistantConversation(conversationId, { platformProjectId });
      conversation = { ...conversation, platformProjectId };
    }
  }

  if (prompt) {
    await createAssistantMessage({
      id: randomUUID(),
      conversationId,
      role: 'user',
      content: prompt,
    });
  }

  const storedMessages = await listAssistantMessagesForConversation(conversationId);
  const history = storedMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      metadata: m.metadata,
    }));

  const profile = await loadUserProfile(user.id);
  const bindingIds = platformProjectId ? await getProjectBindingIds(platformProjectId) : null;

  let projectDomain: string | undefined;
  if (platformProjectId) {
    const project = await getPlatformProjectById(platformProjectId);
    projectDomain = project?.domain?.trim() || undefined;
  }

  const intent = body.confirmToolCall ? { type: 'free_chat' as const } : routeAssistantIntent(prompt);

  const handlerCtx: AssistantHandlerContext = {
    user,
    body,
    conversationId,
    conversation: {
      id: conversation.id,
      userId: conversation.userId,
      platformProjectId: conversation.platformProjectId,
      title: conversation.title,
    },
    platformProjectId,
    bindingIds,
    history,
    prompt,
    profile,
    emit,
    resolvedName: (name?: string) =>
      name?.trim() || extractPendingProjectNameFromHistory(history, prompt) || undefined,
    resolvedDomain: (domain?: string | null) => {
      const fromArg = domain?.trim();
      if (fromArg) return normalizeAssistantTargetUrl(fromArg);
      const fromHistory = extractPendingDomainFromHistory(history, prompt);
      if (fromHistory) return fromHistory;
      if (projectDomain) return normalizeAssistantTargetUrl(projectDomain);
      return undefined;
    },
  };

  const { assistantText, metadata, workflowRunId, conversationPatch } = await dispatchAssistantIntent(
    handlerCtx,
    intent
  );

  if (conversationPatch) {
    await updateAssistantConversation(conversationId, conversationPatch);
  }

  const assistantMessage = await createAssistantMessage({
    id: randomUUID(),
    conversationId,
    role: 'assistant',
    content: assistantText,
    metadata: attachRecommendationsToMetadata(metadata, {
      intent,
      prompt,
      history,
      platformProjectId,
      projectDomain,
    }),
  });

  if (!conversation.title || conversation.title === 'Neuer Chat') {
    await updateAssistantConversation(conversationId, {
      title: prompt.slice(0, 80) || conversation.title,
    });
  }

  emitPhase(emit, 'done');

  return {
    conversationId,
    message: assistantMessage,
    workflowRunId,
    text: assistantText,
    metadata: assistantMessage.metadata ?? metadata,
  };
}
