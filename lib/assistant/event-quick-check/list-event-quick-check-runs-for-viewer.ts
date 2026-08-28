import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  assistantConversations,
  assistantWorkflowRuns,
  USER_ROLE,
  users,
} from '@/lib/db/schema';
import type { StoredAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';

export type EventQuickCheckRunListRow = StoredAssistantWorkflowRun & {
  ownerName: string | null;
  ownerEmail: string | null;
};

function mapRunRow(
  row: typeof assistantWorkflowRuns.$inferSelect
): StoredAssistantWorkflowRun {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    type: row.type,
    status: row.status as StoredAssistantWorkflowRun['status'],
    steps: (row.steps as StoredAssistantWorkflowRun['steps'] | null) ?? [],
    result: row.result ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Platform project ids the user can view (access model B — creator / assignment). */
export async function listVisiblePlatformProjectIdsForUser(userId: string): Promise<string[]> {
  const projects = await listAccessiblePlatformProjectsForUser(userId);
  return projects.map((p) => p.id);
}

/**
 * Own EQC runs plus Collection-visible runs (conversation.platformProjectId).
 * Admins see all EQC runs (capped by limit).
 */
export async function listEventQuickCheckRunsForViewer(input: {
  userId: string;
  userRole: string;
  limit?: number;
}): Promise<EventQuickCheckRunListRow[]> {
  const db = getDb();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const isAdmin = input.userRole === USER_ROLE.ADMIN;

  const visibility = isAdmin
    ? eq(assistantWorkflowRuns.type, EVENT_QUICK_CHECK_PLAYBOOK_ID)
    : await (async () => {
        const projectIds = await listVisiblePlatformProjectIdsForUser(input.userId);
        const own = and(
          eq(assistantWorkflowRuns.userId, input.userId),
          eq(assistantWorkflowRuns.type, EVENT_QUICK_CHECK_PLAYBOOK_ID)
        );
        if (!projectIds.length) return own;
        return and(
          eq(assistantWorkflowRuns.type, EVENT_QUICK_CHECK_PLAYBOOK_ID),
          or(
            eq(assistantWorkflowRuns.userId, input.userId),
            inArray(assistantConversations.platformProjectId, projectIds)
          )
        );
      })();

  const rows = await db
    .select({
      run: assistantWorkflowRuns,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(assistantWorkflowRuns)
    .innerJoin(
      assistantConversations,
      eq(assistantConversations.id, assistantWorkflowRuns.conversationId)
    )
    .leftJoin(users, eq(users.id, assistantWorkflowRuns.userId))
    .where(visibility)
    .orderBy(desc(assistantWorkflowRuns.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    ...mapRunRow(row.run),
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
  }));
}
