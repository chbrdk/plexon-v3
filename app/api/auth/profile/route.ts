/* ------------------------------------------------------------------ */
/*  PLEXON – GET/PATCH /api/auth/profile (authenticated user)          */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  normalizeThemePreference,
  parseThemePreference,
} from '@/lib/theme-preference';
import {
  normalizeAccentPreference,
  parseAccentPreference,
} from '@/lib/accent-preference';
import { ensureUsersThemePreferenceColumn } from '@/lib/ensure-theme-preference-column';
import { ensureUsersAccentPreferenceColumn } from '@/lib/ensure-accent-preference-column';

const DEMO_EMAIL = process.env.PLEXON_DEMO_EMAIL;

const userSelect = {
  id: users.id,
  email: users.email,
  name: users.name,
  company: users.company,
  avatarUrl: users.avatarUrl,
  locale: users.locale,
  themePreference: users.themePreference,
  accentPreference: users.accentPreference,
} as const;

function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  avatarUrl: string | null;
  locale: string | null;
  themePreference: string | null;
  accentPreference: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    company: user.company ?? undefined,
    avatar_url: user.avatarUrl ?? undefined,
    locale: user.locale ?? undefined,
    themePreference: normalizeThemePreference(user.themePreference),
    accentPreference: normalizeAccentPreference(user.accentPreference),
  };
}

async function ensurePrefColumns() {
  await ensureUsersThemePreferenceColumn();
  await ensureUsersAccentPreferenceColumn();
}

export async function GET(request: Request) {
  const requestUser = await getRequestUser(request);
  if (!requestUser) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (requestUser.id === 'demo') {
    return NextResponse.json({
      user: {
        id: 'demo',
        email: DEMO_EMAIL ?? 'demo@plexon.local',
        name: 'Demo User',
        company: undefined,
        avatar_url: undefined,
        locale: 'de',
        themePreference: 'dark' as const,
        accentPreference: 'green' as const,
      },
    });
  }
  const db = getDb();
  await ensurePrefColumns();
  const [user] = await db
    .select(userSelect)
    .from(users)
    .where(eq(users.id, requestUser.id))
    .limit(1);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({ user: serializeUser(user) });
}

export async function PATCH(request: Request) {
  const requestUser = await getRequestUser(request);
  if (!requestUser) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (requestUser.id === 'demo') {
    return apiError('Demo user cannot update profile', API_STATUS.BAD_REQUEST);
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
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
  let themePreference: string | undefined;
  if (body.themePreference !== undefined) {
    const parsed = parseThemePreference(body.themePreference);
    if (!parsed) return apiError('Invalid themePreference', API_STATUS.BAD_REQUEST);
    themePreference = parsed;
  }
  let accentPreference: string | undefined;
  if (body.accentPreference !== undefined) {
    const parsed = parseAccentPreference(body.accentPreference);
    if (!parsed) return apiError('Invalid accentPreference', API_STATUS.BAD_REQUEST);
    accentPreference = parsed;
  }

  const db = getDb();
  await ensurePrefColumns();
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError('Invalid email', API_STATUS.BAD_REQUEST);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0 && existing[0].id !== requestUser.id) return apiError('Email already in use', API_STATUS.CONFLICT);
  }

  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (company !== undefined) updates.company = company;
  if (avatar_url !== undefined) updates.avatarUrl = avatar_url;
  if (locale !== undefined) updates.locale = locale;
  if (themePreference !== undefined) updates.themePreference = themePreference;
  if (accentPreference !== undefined) updates.accentPreference = accentPreference;

  if (Object.keys(updates).length === 0) {
    const [u] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.id, requestUser.id))
      .limit(1);
    if (!u) return apiError('User not found', API_STATUS.NOT_FOUND);
    return NextResponse.json({ user: serializeUser(u) });
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, requestUser.id))
    .returning(userSelect);
  if (!updated) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({ user: serializeUser(updated) });
}
