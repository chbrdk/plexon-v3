import type { RequestUser } from '@/lib/auth-request-user';
import type { AssistantIntent } from '@/lib/assistant/intent-router';
import type { AssistantCompleteBody } from '@/lib/assistant/complete-types';
import type { AssistantStreamEvent, AssistantStreamPhase } from '@/lib/assistant/assistant-sse';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { metadataWithWorkflowSteps } from '@/lib/assistant/ui-blocks/build-workflow-ui';

export type AssistantMessageHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown> | null;
};

export type AssistantConversationRef = {
  id: string;
  userId: string;
  platformProjectId: string | null;
  title: string | null;
};

export type ProjectBindingIds = {
  checkionProjectId: string | null;
  audionProjectId: string | null;
} | null;

export type AssistantHandlerContext = {
  user: RequestUser;
  body: AssistantCompleteBody;
  conversationId: string;
  conversation: AssistantConversationRef;
  platformProjectId?: string;
  bindingIds: ProjectBindingIds;
  history: AssistantMessageHistoryItem[];
  prompt: string;
  profile: { name: string | null; email: string };
  emit?: (event: AssistantStreamEvent) => void;
  resolvedName: (name?: string) => string | undefined;
  resolvedDomain: (domain?: string | null) => string | undefined;
};

export type AssistantHandlerResult = {
  assistantText: string;
  metadata?: Record<string, unknown>;
  workflowRunId?: string;
  conversationPatch?: { platformProjectId?: string; title?: string };
};

export type IntentHandler<T extends AssistantIntent['type'] = AssistantIntent['type']> = (
  ctx: AssistantHandlerContext,
  intent: Extract<AssistantIntent, { type: T }>
) => Promise<AssistantHandlerResult>;

export function emitPhase(
  emit: AssistantHandlerContext['emit'],
  phase: AssistantStreamPhase,
  detail?: string
) {
  emit?.({ type: 'phase', phase, detail });
}

export function metadataWithStepList(
  base: Record<string, unknown>,
  steps: WorkflowStep[],
  title?: string
): Record<string, unknown> {
  return metadataWithWorkflowSteps(base, steps, title);
}
