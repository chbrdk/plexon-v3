import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  addCompanyUser,
  getCompanyById,
  listCompanyUsers,
  removeCompanyUser,
} from '@/lib/db/companies';
import { users } from '@/lib/db/schema';
import { getDb } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { isCompanyUserRole } from '@/lib/platform-companies';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id: companyId } = await ctx.params;
  const company = await getCompanyById(companyId);
  if (!company) return apiError('Not found', API_STATUS.NOT_FOUND);
  const members = await listCompanyUsers(companyId);
  return Response.json({ items: members });
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id: companyId } = await ctx.params;
  const company = await getCompanyById(companyId);
  if (!company) return apiError('Not found', API_STATUS.NOT_FOUND);
  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  if (!Array.isArray(body.items)) {
    return apiError('items must be an array', API_STATUS.BAD_REQUEST);
  }
  const db = getDb();
  const existing = await listCompanyUsers(companyId);
  const nextUserIds = new Set<string>();
  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') {
      return apiError('Each member must be an object', API_STATUS.BAD_REQUEST);
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.userId !== 'string' || !row.userId.trim()) {
      return apiError('Invalid userId', API_STATUS.BAD_REQUEST);
    }
    if (!isCompanyUserRole(row.role)) {
      return apiError('Invalid company role', API_STATUS.BAD_REQUEST);
    }
    const userId = row.userId.trim();
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!u) {
      return apiError(`User not found: ${userId}`, API_STATUS.BAD_REQUEST);
    }
    nextUserIds.add(userId);
    await addCompanyUser({ companyId, userId, role: row.role });
  }
  for (const m of existing) {
    if (!nextUserIds.has(m.userId)) {
      await removeCompanyUser(companyId, m.userId);
    }
  }
  const members = await listCompanyUsers(companyId);
  return Response.json({ items: members });
}
