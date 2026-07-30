/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/admin/users (zentrale User-Liste, nur Admin)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { listAllCompanyMembershipsWithDetails } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const db = getDb();
  const [rows, membershipRows] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        locale: users.locale,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    listAllCompanyMembershipsWithDetails(),
  ]);

  const orgsByUser = new Map<
    string,
    Array<{ companyId: string; companyName: string; companySlug: string | null; role: string }>
  >();
  for (const m of membershipRows) {
    const list = orgsByUser.get(m.userId) ?? [];
    list.push({
      companyId: m.companyId,
      companyName: m.companyName,
      companySlug: m.companySlug,
      role: m.role,
    });
    orgsByUser.set(m.userId, list);
  }

  return NextResponse.json({
    data: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? undefined,
      company: u.company ?? undefined,
      locale: u.locale ?? undefined,
      role: u.role ?? 'user',
      createdAt: u.createdAt.toISOString(),
      organizations: orgsByUser.get(u.id) ?? [],
    })),
  });
}
