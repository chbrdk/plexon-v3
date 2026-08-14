import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory';
import { SYNC_ACCESSIBLE_MIRRORS_CAP } from '@/lib/sync-accessible-capability-mirrors';

export type AccessibleCollectionItem = {
  id: string;
  name: string;
  status: string;
  companyId: string;
  domain: string | null;
};

export type ListAccessibleCollectionsResult = {
  items: AccessibleCollectionItem[];
  totalAccessible: number;
  truncated: boolean;
};

/**
 * Collections the user can see — same directory as
 * {@link syncAccessibleCapabilityMirrors} (cap {@link SYNC_ACCESSIBLE_MIRRORS_CAP}).
 */
export async function listAccessibleCollectionsForUser(
  userId: string
): Promise<ListAccessibleCollectionsResult> {
  const accessible = await listAccessiblePlatformProjectsForUser(userId);
  const truncated = accessible.length > SYNC_ACCESSIBLE_MIRRORS_CAP;
  const slice = accessible.slice(0, SYNC_ACCESSIBLE_MIRRORS_CAP);
  return {
    items: slice.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      companyId: project.companyId,
      domain: project.domain ?? null,
    })),
    totalAccessible: accessible.length,
    truncated,
  };
}
