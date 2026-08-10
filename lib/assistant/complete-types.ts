import type { AssistantPageContext } from '@/lib/assistant/page-context'

export type AssistantCompleteBody = {
  prompt?: string
  conversationId?: string
  platformProjectId?: string
  /** Host page/entity context — specs/domain/assistant-page-context.md */
  pageContext?: AssistantPageContext
  confirmToolCall?: { toolName: string; input: Record<string, unknown> }
}

export type AssistantCompleteResult = {
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  };
  workflowRunId?: string;
  text: string;
  metadata?: Record<string, unknown>;
};
