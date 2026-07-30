import { eq } from 'drizzle-orm';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  getCompanyById,
  listCompanyMembershipsForUser,
  replaceUserCompanyMemberships,
} from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isCompanyUserRole, type CompanyUserRole } from '@/lib/platform-companies';

async function ensureUserExists(userId: string) {
  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id: userId } = await ctx.params;
  const user = await ensureUserExists(userId);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  const rows = await listCompanyMembershipsForUser(userId);
  return Response.json({
    items: rows.map((r) => ({
      companyId: r.companyId,
      companyName: r.companyName,
      companySlug: r.companySlug,
      role: r.role,
    })),
  });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id: userId } = await ctx.params;
  const user = await ensureUserExists(userId);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  if (!Array.isArray(body.items)) {
    return apiError('items must be an array', API_STATUS.BAD_REQUEST);
  }

  const next: Array<{ companyId: string; role: CompanyUserRole }> = [];
  const seenCompany = new Set<string>();
  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') {
      return apiError('Each item must be an object', API_STATUS.BAD_REQUEST);
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.companyId !== 'string' || !row.companyId.trim()) {
      return apiError('Invalid companyId', API_STATUS.BAD_REQUEST);
    }
    if (!isCompanyUserRole(row.role)) {
      return apiError('Invalid company role', API_STATUS.BAD_REQUEST);
    }
    const companyId = row.companyId.trim();
    if (seenCompany.has(companyId)) {
      return apiError('Duplicate companyId in items', API_STATUS.BAD_REQUEST);
    }
    seenCompany.add(companyId);
    const company = await getCompanyById(companyId);
    if (!company) {
      return apiError(`Company not found: ${companyId}`, API_STATUS.BAD_REQUEST);
    }
    next.push({ companyId, role: row.role });
  }

  await replaceUserCompanyMemberships(userId, next);
  const rows = await listCompanyMembershipsForUser(userId);
  return Response.json({
    items: rows.map((r) => ({
      companyId: r.companyId,
      companyName: r.companyName,
      companySlug: r.companySlug,
      role: r.role,
    })),
  });
}
