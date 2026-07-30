import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from './index';
import { companies, companyUsers } from './schema';
import type { CompanyUserRole } from '@/lib/platform-companies';

export async function createCompany(input: { id: string; name: string; slug?: string | null }) {
  const db = getDb();
  const now = new Date();
  await db.insert(companies).values({
    id: input.id,
    name: input.name.trim(),
    slug: input.slug?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateCompany(
  companyId: string,
  patch: { name?: string; slug?: string | null }
) {
  const db = getDb();
  const now = new Date();
  await db
    .update(companies)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug?.trim() || null } : {}),
      updatedAt: now,
    })
    .where(eq(companies.id, companyId));
}

export async function getCompanyById(companyId: string) {
  const db = getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  return row ?? null;
}

export async function listCompanies() {
  const db = getDb();
  return db.select().from(companies);
}

/**
 * Atomically replaces name and slug for the given companies (full row values per id).
 * Clears slugs for all listed ids first so slug swaps within the batch are safe, then applies updates.
 */
export async function bulkReplaceCompanyFields(
  items: Array<{ id: string; name: string; slug: string | null }>
): Promise<void> {
  if (items.length === 0) return;
  const db = getDb();
  const ids = items.map((i) => i.id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error('Duplicate company id in bulk payload');
    seen.add(id);
  }

  await db.transaction(async (tx) => {
    const existingRows = await tx.select().from(companies).where(inArray(companies.id, ids));
    if (existingRows.length !== ids.length) {
      throw new Error('One or more companies not found');
    }

    const normalized: Array<{ id: string; name: string; slug: string | null }> = [];
    for (const it of items) {
      const name = it.name.trim();
      if (!name) throw new Error('Invalid name');
      const slug =
        it.slug === null || it.slug === undefined
          ? null
          : it.slug.trim()
            ? it.slug.trim().toLowerCase()
            : null;
      normalized.push({ id: it.id, name, slug });
    }

    const slugOwners = new Map<string, string>();
    for (const it of normalized) {
      if (it.slug) {
        if (slugOwners.has(it.slug) && slugOwners.get(it.slug) !== it.id) {
          throw new Error('Duplicate slug in bulk payload');
        }
        slugOwners.set(it.slug, it.id);
      }
    }

    const now = new Date();
    await tx.update(companies).set({ slug: null, updatedAt: now }).where(inArray(companies.id, ids));

    const distinctNewSlugs = [...new Set(normalized.map((i) => i.slug).filter((s): s is string => Boolean(s)))];
    for (const slug of distinctNewSlugs) {
      const still = await tx.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug));
      if (still.length > 0) {
        throw new Error(`slug already in use: ${slug}`);
      }
    }

    for (const it of normalized) {
      await tx
        .update(companies)
        .set({ name: it.name, slug: it.slug, updatedAt: new Date() })
        .where(eq(companies.id, it.id));
    }
  });
}

export async function addCompanyUser(input: {
  companyId: string;
  userId: string;
  role: CompanyUserRole;
}) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(companyUsers)
    .values({
      companyId: input.companyId,
      userId: input.userId,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [companyUsers.companyId, companyUsers.userId],
      set: { role: input.role, updatedAt: now },
    });
}

export async function removeCompanyUser(companyId: string, userId: string) {
  const db = getDb();
  await db
    .delete(companyUsers)
    .where(and(eq(companyUsers.companyId, companyId), eq(companyUsers.userId, userId)));
}

export async function listCompanyUsers(companyId: string) {
  const db = getDb();
  return db.select().from(companyUsers).where(eq(companyUsers.companyId, companyId));
}

export async function getCompanyIdsForUser(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ companyId: companyUsers.companyId })
    .from(companyUsers)
    .where(eq(companyUsers.userId, userId));
  return rows.map((r) => r.companyId);
}

export async function getCompanyUserRole(
  companyId: string,
  userId: string
): Promise<CompanyUserRole | null> {
  const db = getDb();
  const [row] = await db
    .select({ role: companyUsers.role })
    .from(companyUsers)
    .where(and(eq(companyUsers.companyId, companyId), eq(companyUsers.userId, userId)))
    .limit(1);
  if (!row) return null;
  return row.role as CompanyUserRole;
}

/** All company memberships (with company display fields) for admin directory views. */
export async function listAllCompanyMembershipsWithDetails() {
  const db = getDb();
  return db
    .select({
      userId: companyUsers.userId,
      companyId: companyUsers.companyId,
      role: companyUsers.role,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id));
}

/** All PLEXON company memberships for a user (with company display fields). */
export async function listCompanyMembershipsForUser(userId: string) {
  const db = getDb();
  return db
    .select({
      companyId: companyUsers.companyId,
      userId: companyUsers.userId,
      role: companyUsers.role,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(companyUsers)
    .innerJoin(companies, eq(companyUsers.companyId, companies.id))
    .where(eq(companyUsers.userId, userId));
}

/**
 * Replaces the user's company memberships with the given list (add/update/remove).
 * Caller must validate duplicate `companyId` and company existence.
 */
export async function replaceUserCompanyMemberships(
  userId: string,
  items: Array<{ companyId: string; role: CompanyUserRole }>
) {
  const db = getDb();
  const existing = await db
    .select({ companyId: companyUsers.companyId })
    .from(companyUsers)
    .where(eq(companyUsers.userId, userId));
  const nextIds = new Set(items.map((i) => i.companyId));
  for (const row of existing) {
    if (!nextIds.has(row.companyId)) {
      await removeCompanyUser(row.companyId, userId);
    }
  }
  for (const it of items) {
    await addCompanyUser({ companyId: it.companyId, userId, role: it.role });
  }
}
