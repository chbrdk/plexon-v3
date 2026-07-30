import type { AssistantIntent } from '@/lib/assistant/intent-router';
import type { ConversationMessageWithMeta } from '@/lib/assistant/conversation-context';
import {
  buildContextualRecommendations,
  buildDefaultConversationStarters,
} from '@/lib/assistant/insights/conversation-recommendations-core';
import {
  buildWorkflowContinuationRecommendations,
  mergeRecommendations,
  type ConversationRecommendation,
} from '@/lib/assistant/insights/follow-up-suggestions';
import { resolveAssistantTargetUrl } from '@/lib/assistant/project-target-url';

export type { ConversationRecommendation };
export {
  buildContextualRecommendations,
  buildDefaultConversationStarters,
} from '@/lib/assistant/insights/conversation-recommendations-core';

export type AttachRecommendationsContext = {
  intent: AssistantIntent;
  prompt: string;
  history: ConversationMessageWithMeta[];
  platformProjectId?: string;
  projectDomain?: string | null;
};

/**
 * Ensures every assistant message ends with actionable conversation recommendations.
 */
export function attachRecommendationsToMetadata(
  metadata: Record<string, unknown> | undefined,
  ctx: AttachRecommendationsContext
): Record<string, unknown> | undefined {
  const base = metadata ?? {};
  const existing = (base.followUpPrompts as ConversationRecommendation[] | undefined) ?? [];
  const workflowType = typeof base.workflowType === 'string' ? base.workflowType : undefined;

  const url = resolveAssistantTargetUrl({
    uiLayout: base.uiLayout,
    history: ctx.history,
    prompt: ctx.prompt,
    projectDomain: ctx.projectDomain,
  });

  const seen = new Set(existing.map((r) => r.id));
  let recs = [...existing];

  if (workflowType && url) {
    recs = mergeRecommendations(
      recs,
      buildWorkflowContinuationRecommendations(workflowType, url),
      seen
    );
  }

  const planner = base.planner as { intent?: string } | undefined;
  recs = mergeRecommendations(
    recs,
    buildContextualRecommendations({
      prompt: ctx.prompt,
      history: ctx.history,
      url,
      platformProjectId: ctx.platformProjectId,
      plannerIntent: planner?.intent,
    }),
    seen
  );

  if (recs.length < 2) {
    recs = mergeRecommendations(
      recs,
      buildDefaultConversationStarters({
        platformProjectId: ctx.platformProjectId,
        url,
      }),
      seen
    );
  }

  recs = recs.slice(0, 5);
  if (recs.length === 0) return metadata;

  return { ...base, followUpPrompts: recs };
}
