import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { RequestUser } from '@/lib/auth-request-user';
import { API_STATUS } from '@/lib/api-error-handler';
import {
  ASSISTANT_DOCUMENT_ATTACHMENT_PLACEHOLDER,
  ASSISTANT_IMAGE_ATTACHMENT_PLACEHOLDER,
} from '@/lib/constants';
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
import { parseAssistantPageContext } from '@/lib/assistant/page-context';
import {
  resolveAssistantImages,
  type AssistantResolvedImage,
} from '@/lib/assistant/image-upload-store';
import {
  resolveAssistantDocuments,
  type AssistantResolvedDocument,
} from '@/lib/assistant/document-upload-store';
import { normalizeAssistantImageIds, countParseableAssistantImages } from '@/lib/assistant/user-turn-images';
import { normalizeAssistantDocumentIds } from '@/lib/assistant/user-turn-documents';
import { mergeUserMessageWithDocuments } from '@/lib/assistant/merge-documents';

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

function userMessagePlaceholder(images: unknown[], documents: unknown[]): string {
  if (images.length > 0) return ASSISTANT_IMAGE_ATTACHMENT_PLACEHOLDER;
  if (documents.length > 0) return ASSISTANT_DOCUMENT_ATTACHMENT_PLACEHOLDER;
  return '';
}

export async function handleAssistantComplete(
  user: RequestUser,
  bodyInput: AssistantCompleteBody,
  emit?: (event: AssistantStreamEvent) => void
): Promise<AssistantCompleteResult> {
  let body = bodyInput;
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const imageIds = body.confirmToolCall ? [] : normalizeAssistantImageIds(body.imageIds);
  const documentIds = body.confirmToolCall ? [] : normalizeAssistantDocumentIds(body.documentIds);
  if (!prompt && !body.confirmToolCall && imageIds.length === 0 && documentIds.length === 0) {
    const err = new Error('Missing or empty prompt') as Error & { status?: number };
    err.status = API_STATUS.BAD_REQUEST;
    throw err;
  }

  let images: AssistantResolvedImage[] = [];
  if (imageIds.length > 0) {
    const resolved = await resolveAssistantImages(imageIds, user.id);
    if (!resolved.ok) {
      const err = new Error(resolved.error) as Error & { status?: number };
      err.status = API_STATUS.BAD_REQUEST;
      throw err;
    }
    images = resolved.images;
    if (countParseableAssistantImages(images) === 0) {
      const err = new Error('Attached images could not be decoded') as Error & { status?: number };
      err.status = API_STATUS.BAD_REQUEST;
      throw err;
    }
  }

  let documents: AssistantResolvedDocument[] = [];
  if (documentIds.length > 0) {
    const resolved = await resolveAssistantDocuments(documentIds, user.id);
    if (!resolved.ok) {
      const err = new Error(resolved.error) as Error & { status?: number };
      err.status = API_STATUS.BAD_REQUEST;
      throw err;
    }
    documents = resolved.documents;
  }

  const modelPrompt = mergeUserMessageWithDocuments(prompt, documents);

  let conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  let conversation = conversationId ? await getAssistantConversationById(conversationId) : null;
  if (conversation && conversation.userId !== user.id) {
    const err = new Error('Forbidden') as Error & { status?: number };
    err.status = API_STATUS.FORBIDDEN;
    throw err;
  }

  if (!conversation) {
    const titleSeed =
      prompt.slice(0, 80) ||
      (documents.length ? 'Dokument-Anhang' : images.length ? 'Bild-Anhang' : 'Neuer Chat');
    conversation = await createAssistantConversation({
      id: randomUUID(),
      userId: user.id,
      title: titleSeed,
    });
    conversationId = conversation.id;
  }

  const pageContext = parseAssistantPageContext(body.pageContext);
  if (pageContext) {
    body = { ...body, pageContext };
  }

  const platformProjectId =
    (typeof body.platformProjectId === 'string' ? body.platformProjectId.trim() : null) ||
    pageContext?.platformProjectId ||
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

  if (prompt || images.length > 0 || documents.length > 0) {
    const metadata: Record<string, unknown> = {};
    if (images.length > 0) metadata.images = images;
    if (documents.length > 0) {
      metadata.documents = documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        charCount: d.charCount,
      }));
    }
    await createAssistantMessage({
      id: randomUUID(),
      conversationId,
      role: 'user',
      content: prompt || userMessagePlaceholder(images, documents),
      metadata: Object.keys(metadata).length ? metadata : null,
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

  // Attachments must reach the model — don't drop them into a deterministic intent that ignores prompt body.
  const hasAttachments = images.length > 0 || documents.length > 0;
  const intent = body.confirmToolCall
    ? { type: 'free_chat' as const }
    : hasAttachments
      ? { type: 'free_chat' as const }
      : routeAssistantIntent(prompt);

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
    prompt: modelPrompt,
    images,
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
