/* ------------------------------------------------------------------ */
/*  PLEXON – GET/PATCH/DELETE /api/admin/users/[id] (nur Admin)         */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getDb } from '@/lib/db';
import { users, USER_ROLE } from '@/lib/db/schema';
import {
  deprovisionUserAcrossProducts,
  syncUserProductProvisioning,
} from '@/lib/platform-provisioning-service';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      company: user.company ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      locale: user.locale ?? undefined,
      role: user.role ?? USER_ROLE.USER,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
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
  const role =
    typeof body.role === 'string' && (body.role === USER_ROLE.USER || body.role === USER_ROLE.ADMIN)
      ? body.role
      : undefined;

  const db = getDb();
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError('Invalid email', API_STATUS.BAD_REQUEST);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0 && existing[0].id !== id) return apiError('Email already in use', API_STATUS.CONFLICT);
  }

  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (company !== undefined) updates.company = company;
  if (avatar_url !== undefined) updates.avatarUrl = avatar_url;
  if (locale !== undefined) updates.locale = locale;
  if (role !== undefined) updates.role = role;

  if (Object.keys(updates).length === 0) {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        avatarUrl: users.avatarUrl,
        locale: users.locale,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return apiError('User not found', API_STATUS.NOT_FOUND);
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        company: u.company ?? undefined,
        avatar_url: u.avatarUrl ?? undefined,
        locale: u.locale ?? undefined,
        role: u.role ?? USER_ROLE.USER,
        createdAt: u.createdAt.toISOString(),
      },
    });
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      role: users.role,
      createdAt: users.createdAt,
    });
  if (!updated) return apiError('User not found', API_STATUS.NOT_FOUND);
  await syncUserProductProvisioning(id, {
    force: true,
    source: 'plexon-admin-user-profile',
  });
  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name ?? undefined,
      company: updated.company ?? undefined,
      avatar_url: updated.avatarUrl ?? undefined,
      locale: updated.locale ?? undefined,
      role: updated.role ?? USER_ROLE.USER,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  if (admin.id === id) {
    return apiError('Cannot delete your own account', API_STATUS.BAD_REQUEST);
  }
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return apiError('User not found', API_STATUS.NOT_FOUND);

  try {
    await deprovisionUserAcrossProducts(id);
  } catch {
    // Best-effort: central delete still proceeds if downstream deprovision fails.
  }

  const deleted = await db.delete(users).where(eq(users.id, id));
  if ((deleted.rowCount ?? 0) === 0) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({ success: true });
}
