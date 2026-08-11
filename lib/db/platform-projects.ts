import { and, eq, inArray, ne } from 'drizzle-orm';
import { getDb } from './index';
import { platformProjects } from './schema';
import { PLATFORM_PROJECT_STATUS, type PlatformProjectStatus } from '@/lib/platform-companies';

export type ListPlatformProjectsOptions = {
  /** When false (default), exclude archived Collections. */
  includeArchived?: boolean;
};

export async function createPlatformProject(input: {
  id: string;
  companyId: string;
  name: string;
  domain?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: PlatformProjectStatus;
  createdByUserId?: string | null;
}) {
  const db = getDb();
  const now = new Date();
  await db.insert(platformProjects).values({
    id: input.id,
    companyId: input.companyId,
    name: input.name.trim(),
    domain: input.domain?.trim() || null,
    metadata: input.metadata ?? null,
    status: input.status ?? PLATFORM_PROJECT_STATUS.ACTIVE,
    createdByUserId: input.createdByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePlatformProject(
  platformProjectId: string,
  patch: {
    name?: string;
    domain?: string | null;
    metadata?: Record<string, unknown> | null;
    status?: PlatformProjectStatus;
  }
) {
  const db = getDb();
  const now = new Date();
  await db
    .update(platformProjects)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.domain !== undefined ? { domain: patch.domain?.trim() || null } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: now,
    })
    .where(eq(platformProjects.id, platformProjectId));
}

export async function getPlatformProjectById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(platformProjects).where(eq(platformProjects.id, id)).limit(1);
  return row ?? null;
}

export async function listPlatformProjectsForCompany(
  companyId: string,
  options: ListPlatformProjectsOptions = {}
) {
  const db = getDb();
  const includeArchived = options.includeArchived === true;
  if (includeArchived) {
    return db.select().from(platformProjects).where(eq(platformProjects.companyId, companyId));
  }
  return db
    .select()
    .from(platformProjects)
    .where(
      and(
        eq(platformProjects.companyId, companyId),
        ne(platformProjects.status, PLATFORM_PROJECT_STATUS.ARCHIVED)
      )
    );
}

export async function listPlatformProjectsForCompanies(
  companyIds: string[],
  options: ListPlatformProjectsOptions = {}
) {
  if (companyIds.length === 0) return [];
  const db = getDb();
  const includeArchived = options.includeArchived === true;
  if (includeArchived) {
    return db.select().from(platformProjects).where(inArray(platformProjects.companyId, companyIds));
  }
  return db
    .select()
    .from(platformProjects)
    .where(
      and(
        inArray(platformProjects.companyId, companyIds),
        ne(platformProjects.status, PLATFORM_PROJECT_STATUS.ARCHIVED)
      )
    );
}

export async function deletePlatformProject(platformProjectId: string) {
  const db = getDb();
  await db.delete(platformProjects).where(eq(platformProjects.id, platformProjectId));
}

export async function userHasPlatformProjectAccess(
  userId: string,
  platformProjectId: string,
  companyIds: string[]
): Promise<boolean> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return false;
  return companyIds.includes(project.companyId);
}
