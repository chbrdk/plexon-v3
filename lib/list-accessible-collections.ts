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
  /** Opaque cursor for next page (name\\0id). Null when no more. */
  nextCursor: string | null;
  limit: number;
};

export type ListAccessibleCollectionsOptions = {
  /** Page size (default {@link SYNC_ACCESSIBLE_MIRRORS_CAP}, max 100). */
  limit?: number;
  /** Opaque cursor from a previous response. */
  cursor?: string | null;
};

function encodeCursor(name: string, id: string): string {
  return Buffer.from(`${name}\0${id}`, 'utf8').toString('base64url');
}

export function decodeAccessibleCollectionsCursor(
  cursor: string | null | undefined
): { name: string; id: string } | null {
  if (!cursor?.trim()) return null;
  try {
    const raw = Buffer.from(cursor.trim(), 'base64url').toString('utf8');
    const sep = raw.indexOf('\0');
    if (sep < 0) return null;
    const name = raw.slice(0, sep);
    const id = raw.slice(sep + 1);
    if (!name || !id) return null;
    return { name, id };
  } catch {
    return null;
  }
}

function clampLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit)) return SYNC_ACCESSIBLE_MIRRORS_CAP;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

/**
 * Collections the user can see — same directory as
 * {@link syncAccessibleCapabilityMirrors}. Supports cursor pagination (Wave B).
 */
export async function listAccessibleCollectionsForUser(
  userId: string,
  options: ListAccessibleCollectionsOptions = {}
): Promise<ListAccessibleCollectionsResult> {
  const limit = clampLimit(options.limit);
  const accessible = await listAccessiblePlatformProjectsForUser(userId);
  const cursor = decodeAccessibleCollectionsCursor(options.cursor);

  let start = 0;
  if (cursor) {
    const idx = accessible.findIndex(
      (p) =>
        p.name.localeCompare(cursor.name, undefined, { sensitivity: 'base' }) > 0 ||
        (p.name.localeCompare(cursor.name, undefined, { sensitivity: 'base' }) === 0 &&
          p.id > cursor.id)
    );
    // findIndex returns first strictly after cursor; if none, past end
    start = idx < 0 ? accessible.length : idx;
  }

  const slice = accessible.slice(start, start + limit);
  const hasMore = start + limit < accessible.length;
  const last = slice[slice.length - 1];
  return {
    items: slice.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      companyId: project.companyId,
      domain: project.domain ?? null,
    })),
    totalAccessible: accessible.length,
    truncated: hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.name, last.id) : null,
    limit,
  };
}
