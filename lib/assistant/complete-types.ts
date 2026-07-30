export type AssistantCompleteBody = {
  prompt?: string;
  conversationId?: string;
  platformProjectId?: string;
  confirmToolCall?: { toolName: string; input: Record<string, unknown> };
};

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
