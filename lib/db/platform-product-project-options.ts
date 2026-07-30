import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { getDb } from './index';
import { platformProjectProductBindings, platformProjects } from './schema';

export type BoundPlatformProjectRow = {
  platformProjectId: string;
  name: string;
  domain: string | null;
  externalProjectId: string;
};

/**
 * Platform projects that have a non-empty external project id for CHECKION or AUDION.
 */
export async function listBoundPlatformProjectsForProduct(
  productId: 'checkion' | 'audion'
): Promise<BoundPlatformProjectRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      platformProjectId: platformProjects.id,
      name: platformProjects.name,
      domain: platformProjects.domain,
      externalProjectId: platformProjectProductBindings.externalProjectId,
    })
    .from(platformProjects)
    .innerJoin(
      platformProjectProductBindings,
      and(
        eq(platformProjectProductBindings.platformProjectId, platformProjects.id),
        eq(platformProjectProductBindings.productId, productId)
      )
    )
    .where(
      and(
        isNotNull(platformProjectProductBindings.externalProjectId),
        ne(platformProjectProductBindings.externalProjectId, '')
      )
    );

  return rows
    .map((row) => ({
      platformProjectId: row.platformProjectId,
      name: row.name,
      domain: row.domain,
      externalProjectId: String(row.externalProjectId ?? '').trim(),
    }))
    .filter((row) => row.externalProjectId.length > 0);
}
