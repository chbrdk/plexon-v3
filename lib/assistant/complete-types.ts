import type { AssistantPageContext } from '@/lib/assistant/page-context'
import type { AssistantResolvedImage } from '@/lib/assistant/image-upload-store'

export type AssistantCompleteBody = {
  prompt?: string
  conversationId?: string
  platformProjectId?: string
  /** Host page/entity context — specs/domain/assistant-page-context.md */
  pageContext?: AssistantPageContext
  confirmToolCall?: { toolName: string; input: Record<string, unknown> }
  /** Temp upload IDs from POST /api/assistant/images/upload */
  imageIds?: string[] | null
  /** Temp upload IDs from POST /api/assistant/documents/upload */
  documentIds?: string[] | null
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

export type { AssistantResolvedImage };
