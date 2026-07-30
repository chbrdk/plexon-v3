import {
  assignCheckionResourceToProject,
  type CheckionAssignKind,
} from '@/lib/integrations/checkion-assign-client';

export type AutoAssignResult = {
  assigned: boolean;
  error?: string;
};

/** Best-effort PATCH assign when a CHECKION binding exists (idempotent if already set at create). */
export async function tryAutoAssignCheckionResource(input: {
  kind: CheckionAssignKind;
  resourceId: string;
  checkionProjectId?: string | null;
}): Promise<AutoAssignResult> {
  const projectId = input.checkionProjectId?.trim();
  const resourceId = input.resourceId?.trim();
  if (!projectId || !resourceId) {
    return { assigned: false };
  }

  const result = await assignCheckionResourceToProject({
    kind: input.kind,
    resourceId,
    projectId,
  });
  if (!result.ok) {
    return { assigned: false, error: result.error };
  }
  return { assigned: true };
}
