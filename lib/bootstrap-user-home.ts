/**
 * Ensure a session user has a home company (+ optional first Collection).
 * Used by E2E staging setup and empty-account onboarding seed.
 */

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import type { RequestUser } from '@/lib/auth-request-user'
import { listUserCompanies } from '@/lib/assistant/user-eligibility'
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project'
import { getDb } from '@/lib/db'
import { addCompanyUser, createCompany } from '@/lib/db/companies'
import { ensureBindingPlaceholders } from '@/lib/db/platform-project-bindings'
import { createPlatformProject } from '@/lib/db/platform-projects'
import { upsertUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments'
import { users } from '@/lib/db/schema'
import { COMPANY_USER_ROLE } from '@/lib/platform-companies'
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning'
import { listAccessiblePlatformProjectsForUser } from '@/lib/platform-project-directory'
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service'

export type BootstrapUserHomeResult = {
  ok: true
  companyId: string
  companyCreated: boolean
  platformProjectId?: string
  collectionCreated: boolean
  collectionError?: string
}

export async function ensureUserHomeCompany(user: RequestUser): Promise<{
  companyId: string
  created: boolean
}> {
  const existing = await listUserCompanies(user.id)
  if (existing[0]) {
    return { companyId: existing[0].id, created: false }
  }

  const db = getDb()
  const [row] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  const label = (row?.name?.trim() || row?.email?.split('@')[0] || 'User').slice(0, 48)
  const companyId = randomUUID()
  const slugBase = `home-${user.id.replace(/-/g, '').slice(0, 12)}`
  await createCompany({
    id: companyId,
    name: `${label} Org`,
    slug: slugBase,
  })
  await addCompanyUser({
    companyId,
    userId: user.id,
    role: COMPANY_USER_ROLE.OWNER,
  })
  return { companyId, created: true }
}

/** Seed Collection without product-entitlement gate (empty E2E accounts). */
async function createSeedCollection(input: {
  user: RequestUser
  companyId: string
  name: string
  domain?: string
}): Promise<{ platformProjectId: string } | { error: string }> {
  const platformProjectId = randomUUID()
  try {
    await createPlatformProject({
      id: platformProjectId,
      companyId: input.companyId,
      name: input.name,
      domain: input.domain ?? null,
      createdByUserId: input.user.id,
    })
    await ensureBindingPlaceholders(platformProjectId)
    await upsertUserPlatformProjectAssignment(
      input.user.id,
      platformProjectId,
      PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN
    )
    await syncPlatformProjectToProducts(platformProjectId, {
      source: 'plexon-bootstrap-home',
    }).catch(() => undefined)
    return { platformProjectId }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'collection_create_failed' }
  }
}

export async function bootstrapUserHome(
  user: RequestUser,
  options?: { createCollection?: boolean; collectionName?: string }
): Promise<BootstrapUserHomeResult> {
  const home = await ensureUserHomeCompany(user)
  let platformProjectId: string | undefined
  let collectionCreated = false
  let collectionError: string | undefined

  if (options?.createCollection !== false) {
    const existing = await listAccessiblePlatformProjectsForUser(user.id)
    if (existing[0]) {
      platformProjectId = existing[0].id
    } else {
      const viaWorkflow = await createPlatformProjectWorkflow(
        user,
        {
          name: options?.collectionName?.trim() || 'E2E Suite Collection',
          domain: 'example.com',
          companyId: home.companyId,
          syncProducts: true,
        },
        {}
      )
      if (viaWorkflow.result.ok && viaWorkflow.result.platformProjectId) {
        platformProjectId = viaWorkflow.result.platformProjectId
        collectionCreated = true
      } else {
        const seeded = await createSeedCollection({
          user,
          companyId: home.companyId,
          name: options?.collectionName?.trim() || 'E2E Suite Collection',
          domain: 'example.com',
        })
        if ('platformProjectId' in seeded) {
          platformProjectId = seeded.platformProjectId
          collectionCreated = true
        } else {
          collectionError =
            viaWorkflow.result.error ?? seeded.error ?? 'collection_create_failed'
        }
      }
    }
  }

  return {
    ok: true,
    companyId: home.companyId,
    companyCreated: home.created,
    platformProjectId,
    collectionCreated,
    collectionError,
  }
}
