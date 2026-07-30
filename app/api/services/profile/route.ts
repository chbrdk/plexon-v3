/* ------------------------------------------------------------------ */
/*  PLEXON – GET/PATCH /api/services/profile (für CHECKION/AUDION)     */
/* ------------------------------------------------------------------ */
/* Services holen/schreiben Profil (name, company, avatar_url, locale,
   optional default_platform_company_id) per X-Service-Secret und user_id. */

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { companyUsers, users } from '@/lib/db/schema';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { platformJson, readServiceSecret } from '@/lib/platform-contract';

function checkSecret(request: Request): boolean {
  const SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET ?? '';
  const secret = readServiceSecret(request);
  return Boolean(SERVICE_SECRET && secret === SERVICE_SECRET);
}

/** First platform company membership (oldest join) — same id AUDION sends as `platform_company_id`. */
async function defaultPlatformCompanyIdForUser(userId: string): Promise<string | undefined> {
  const db = getDb();
  const [row] = await db
    .select({ companyId: companyUsers.companyId })
    .from(companyUsers)
    .where(eq(companyUsers.userId, userId))
    .orderBy(asc(companyUsers.createdAt))
    .limit(1);
  const id = row?.companyId?.trim();
  return id || undefined;
}

export async function GET(request: Request) {
  if (!checkSecret(request)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id')?.trim();
  const email = url.searchParams.get('email')?.trim()?.toLowerCase();
  if (!userId && !email) return apiError('user_id or email required', API_STATUS.BAD_REQUEST);

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
    })
    .from(users)
    .where(userId ? eq(users.id, userId) : eq(users.email, email!))
    .limit(1);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  const defaultPlatformCompanyId = await defaultPlatformCompanyIdForUser(user.id);
  return platformJson({
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      company: user.company ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      locale: user.locale ?? undefined,
      ...(defaultPlatformCompanyId ? { default_platform_company_id: defaultPlatformCompanyId } : {}),
    },
  });
}

export async function PATCH(request: Request) {
  if (!checkSecret(request)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : undefined;
  if (!userId) return apiError('user_id required', API_STATUS.BAD_REQUEST);

  const name = typeof body.name === 'string' ? body.name.trim() || null : undefined;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  const company = typeof body.company === 'string' ? body.company.trim() || null : undefined;
  const avatar_url =
    typeof body.avatar_url === 'string'
      ? body.avatar_url.trim() || null
      : body.avatar_url === null
        ? null
        : undefined;
  const locale = typeof body.locale === 'string' ? body.locale.trim() || null : undefined;

  const db = getDb();
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError('Invalid email', API_STATUS.BAD_REQUEST);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0 && existing[0].id !== userId) return apiError('Email already in use', API_STATUS.CONFLICT);
  }

  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (company !== undefined) updates.company = company;
  if (avatar_url !== undefined) updates.avatarUrl = avatar_url;
  if (locale !== undefined) updates.locale = locale;

  if (Object.keys(updates).length === 0) {
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return apiError('User not found', API_STATUS.NOT_FOUND);
    const defaultPlatformCompanyId = await defaultPlatformCompanyIdForUser(u.id);
    return platformJson({
      user: {
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        company: u.company ?? undefined,
        avatar_url: u.avatarUrl ?? undefined,
        locale: u.locale ?? undefined,
        ...(defaultPlatformCompanyId ? { default_platform_company_id: defaultPlatformCompanyId } : {}),
      },
    });
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
    });
  if (!updated) return apiError('User not found', API_STATUS.NOT_FOUND);
  const defaultPlatformCompanyId = await defaultPlatformCompanyIdForUser(updated.id);
  return platformJson({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name ?? undefined,
      company: updated.company ?? undefined,
      avatar_url: updated.avatarUrl ?? undefined,
      locale: updated.locale ?? undefined,
      ...(defaultPlatformCompanyId ? { default_platform_company_id: defaultPlatformCompanyId } : {}),
    },
  });
}
