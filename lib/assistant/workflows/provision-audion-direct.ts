import { ensureBindingPlaceholders, upsertPlatformProjectBinding } from '@/lib/db/platform-project-bindings';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import { createAudionProject } from '@/lib/integrations/audion-project-client';
import { EVENT_QUICK_CHECK_BINDING_SOURCE } from '@/lib/paths/assistant-workflows';

export type ProvisionAudionDirectResult =
  | { ok: true; audionProjectId: string; bound: boolean }
  | { ok: false; error: string };

/** Create AUDION project via service API when platform sync did not produce a binding. */
export async function provisionAudionDirect(input: {
  projectName: string;
  platformProjectId?: string | null;
  source?: string;
}): Promise<ProvisionAudionDirectResult> {
  const created = await createAudionProject(input.projectName);
  if (!created.ok) {
    return { ok: false, error: created.error };
  }

  let bound = false;
  const platformProjectId = input.platformProjectId?.trim();
  if (platformProjectId) {
    await ensureBindingPlaceholders(platformProjectId);
    await upsertPlatformProjectBinding({
      platformProjectId,
      productId: 'audion',
      externalProjectId: created.id,
      syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
      syncMessage: input.source ?? `${EVENT_QUICK_CHECK_BINDING_SOURCE}-direct`,
      lastSyncAt: new Date(),
    });
    bound = true;
  }

  return { ok: true, audionProjectId: created.id, bound };
}
