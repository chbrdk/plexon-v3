/**
 * Resolve owner + company for product-origin Collection creates.
 * Service-authenticated callers may omit both — Plexon picks (or bootstraps) a home.
 */

import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { asc, eq } from 'drizzle-orm'

import {
  addCompanyUser,
  createCompany,
  getCompanyById,
  getCompanyIdsForUser,
  listAllCompanyMembershipsWithDetails,
  listCompanies,
  listCompanyUsers,
} from '@/lib/db/companies'
import { getDb } from '@/lib/db'
import { users, USER_ROLE } from '@/lib/db/schema'
import { COMPANY_USER_ROLE } from '@/lib/platform-companies'

export type OriginOwnerResolution = {
  ownerPlexonUserId: string
  platformCompanyId: string
  /** How ownership was chosen (for logs / tests). */
  source:
    | 'explicit'
    | 'owner_default_company'
    | 'company_member'
    | 'existing_membership'
    | 'attach_user_to_company'
    | 'bootstrap_company'
    | 'bootstrap_user_and_company'
}

const ROLE_RANK: Record<string, number> = {
  [COMPANY_USER_ROLE.OWNER]: 0,
  [COMPANY_USER_ROLE.ADMIN]: 1,
  [COMPANY_USER_ROLE.MEMBER]: 2,
}

/** Stable service identities for machine federation when the island is empty. */
export const FEDERATION_BOOTSTRAP = {
  userId: 'user-plexon-federation',
  email: 'federation@plexon.local',
  name: 'Plexon Federation',
  companyId: 'co-plexon-federation',
  companyName: 'Federation',
  companySlug: 'federation',
} as const

function pickBestMembership(
  rows: Array<{ userId: string; companyId: string; role: string }>,
): { userId: string; companyId: string } | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort(
    (a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9),
  )
  return { userId: sorted[0].userId, companyId: sorted[0].companyId }
}

async function listUsersOldestFirst(): Promise<Array<{ id: string }>> {
  const db = getDb()
  return db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt)).limit(50)
}

async function ensureFederationUser(): Promise<string> {
  const db = getDb()
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, FEDERATION_BOOTSTRAP.userId))
    .limit(1)
  if (existing) return existing.id

  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, FEDERATION_BOOTSTRAP.email))
    .limit(1)
  if (byEmail) return byEmail.id

  const passwordHash = await bcrypt.hash(randomUUID(), 10)
  await db.insert(users).values({
    id: FEDERATION_BOOTSTRAP.userId,
    email: FEDERATION_BOOTSTRAP.email,
    passwordHash,
    name: FEDERATION_BOOTSTRAP.name,
    role: USER_ROLE.ADMIN,
  })
  return FEDERATION_BOOTSTRAP.userId
}

async function ensureFederationCompany(ownerUserId: string): Promise<string> {
  const existing = await getCompanyById(FEDERATION_BOOTSTRAP.companyId)
  if (!existing) {
    await createCompany({
      id: FEDERATION_BOOTSTRAP.companyId,
      name: FEDERATION_BOOTSTRAP.companyName,
      slug: FEDERATION_BOOTSTRAP.companySlug,
    })
  }
  await addCompanyUser({
    companyId: FEDERATION_BOOTSTRAP.companyId,
    userId: ownerUserId,
    role: COMPANY_USER_ROLE.OWNER,
  })
  return FEDERATION_BOOTSTRAP.companyId
}

/**
 * Resolve a valid (owner, company) pair for Collection origin registration.
 * Throws Error with message suitable for API 4xx/5xx mapping when impossible.
 */
export async function resolveProductOriginOwner(input: {
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
}): Promise<OriginOwnerResolution> {
  const ownerIn = input.ownerPlexonUserId?.trim() || ''
  const companyIn = input.platformCompanyId?.trim() || ''
  const db = getDb()

  if (ownerIn && companyIn) {
    const [ownerRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, ownerIn))
      .limit(1)
    if (!ownerRow) throw new Error('Unknown ownerPlexonUserId')
    const companyIds = await getCompanyIdsForUser(ownerIn)
    if (!companyIds.includes(companyIn)) {
      throw new Error('ownerPlexonUserId is not a member of platformCompanyId')
    }
    return {
      ownerPlexonUserId: ownerIn,
      platformCompanyId: companyIn,
      source: 'explicit',
    }
  }

  if (ownerIn) {
    const [ownerRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, ownerIn))
      .limit(1)
    if (!ownerRow) throw new Error('Unknown ownerPlexonUserId')
    const companyIds = await getCompanyIdsForUser(ownerIn)
    if (companyIds[0]) {
      return {
        ownerPlexonUserId: ownerIn,
        platformCompanyId: companyIds[0],
        source: 'owner_default_company',
      }
    }
    // Owner exists but has no company — bootstrap a home company for them.
    const companyId = await ensureFederationCompany(ownerIn)
    return {
      ownerPlexonUserId: ownerIn,
      platformCompanyId: companyId,
      source: 'bootstrap_company',
    }
  }

  if (companyIn) {
    const company = await getCompanyById(companyIn)
    if (!company) throw new Error('Unknown platformCompanyId')
    const members = await listCompanyUsers(companyIn)
    const best = pickBestMembership(
      members.map((m) => ({ userId: m.userId, companyId: companyIn, role: m.role })),
    )
    if (best) {
      return {
        ownerPlexonUserId: best.userId,
        platformCompanyId: companyIn,
        source: 'company_member',
      }
    }
    const ownerId = await ensureFederationUser()
    await addCompanyUser({
      companyId: companyIn,
      userId: ownerId,
      role: COMPANY_USER_ROLE.OWNER,
    })
    return {
      ownerPlexonUserId: ownerId,
      platformCompanyId: companyIn,
      source: 'attach_user_to_company',
    }
  }

  const memberships = await listAllCompanyMembershipsWithDetails()
  const best = pickBestMembership(
    memberships.map((m) => ({
      userId: m.userId,
      companyId: m.companyId,
      role: m.role,
    })),
  )
  if (best) {
    return {
      ownerPlexonUserId: best.userId,
      platformCompanyId: best.companyId,
      source: 'existing_membership',
    }
  }

  const allUsers = await listUsersOldestFirst()
  const allCompanies = await listCompanies()

  if (allUsers[0] && allCompanies[0]) {
    await addCompanyUser({
      companyId: allCompanies[0].id,
      userId: allUsers[0].id,
      role: COMPANY_USER_ROLE.OWNER,
    })
    return {
      ownerPlexonUserId: allUsers[0].id,
      platformCompanyId: allCompanies[0].id,
      source: 'attach_user_to_company',
    }
  }

  if (allUsers[0] && !allCompanies[0]) {
    const companyId = randomUUID()
    await createCompany({
      id: companyId,
      name: FEDERATION_BOOTSTRAP.companyName,
      slug: `${FEDERATION_BOOTSTRAP.companySlug}-${companyId.slice(0, 8)}`,
    })
    await addCompanyUser({
      companyId,
      userId: allUsers[0].id,
      role: COMPANY_USER_ROLE.OWNER,
    })
    return {
      ownerPlexonUserId: allUsers[0].id,
      platformCompanyId: companyId,
      source: 'bootstrap_company',
    }
  }

  const ownerId = await ensureFederationUser()
  const companyId = await ensureFederationCompany(ownerId)
  return {
    ownerPlexonUserId: ownerId,
    platformCompanyId: companyId,
    source: 'bootstrap_user_and_company',
  }
}
