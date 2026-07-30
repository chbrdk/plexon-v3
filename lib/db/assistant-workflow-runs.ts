import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { assistantWorkflowRuns } from './schema';

export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type WorkflowStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  progress?: number;
};

export type StoredAssistantWorkflowRun = {
  id: string;
  conversationId: string;
  userId: string;
  type: string;
  status: WorkflowRunStatus;
  steps: WorkflowStep[];
  result: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: typeof assistantWorkflowRuns.$inferSelect): StoredAssistantWorkflowRun {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    type: row.type,
    status: row.status as WorkflowRunStatus,
    steps: (row.steps as WorkflowStep[] | null) ?? [],
    result: row.result ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAssistantWorkflowRun(input: {
  id: string;
  conversationId: string;
  userId: string;
  type: string;
  steps?: WorkflowStep[];
}): Promise<StoredAssistantWorkflowRun> {
  const db = getDb();
  const now = new Date();
  await db.insert(assistantWorkflowRuns).values({
    id: input.id,
    conversationId: input.conversationId,
    userId: input.userId,
    type: input.type,
    status: 'pending',
    steps: input.steps ?? [],
    result: null,
    createdAt: now,
    updatedAt: now,
  });
  const row = await getAssistantWorkflowRunById(input.id);
  if (!row) throw new Error('Failed to create workflow run');
  return row;
}

export async function getAssistantWorkflowRunById(id: string): Promise<StoredAssistantWorkflowRun | null> {
  const db = getDb();
  const [row] = await db.select().from(assistantWorkflowRuns).where(eq(assistantWorkflowRuns.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function listAssistantWorkflowRunsForUser(input: {
  userId: string;
  type: string;
  limit?: number;
}): Promise<StoredAssistantWorkflowRun[]> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const rows = await db
    .select()
    .from(assistantWorkflowRuns)
    .where(and(eq(assistantWorkflowRuns.userId, input.userId), eq(assistantWorkflowRuns.type, input.type)))
    .orderBy(desc(assistantWorkflowRuns.updatedAt))
    .limit(limit);
  return rows.map(mapRow);
}

export async function updateAssistantWorkflowRun(
  id: string,
  patch: {
    status?: WorkflowRunStatus;
    steps?: WorkflowStep[];
    result?: Record<string, unknown> | null;
  }
): Promise<void> {
  const db = getDb();
  await db
    .update(assistantWorkflowRuns)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.steps !== undefined ? { steps: patch.steps } : {}),
      ...(patch.result !== undefined ? { result: patch.result } : {}),
      updatedAt: new Date(),
    })
    .where(eq(assistantWorkflowRuns.id, id));
}
