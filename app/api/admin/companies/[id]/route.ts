import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getCompanyById, updateCompany } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const row = await getCompanyById(id);
  if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);
  return Response.json(row);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const existing = await getCompanyById(id);
  if (!existing) return apiError('Not found', API_STATUS.NOT_FOUND);
  let body: { name?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const patch: { name?: string; slug?: string | null } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return apiError('Invalid name', API_STATUS.BAD_REQUEST);
    }
    patch.name = body.name;
  }
  if (body.slug !== undefined) {
    patch.slug =
      typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : null;
  }
  if (patch.slug) {
    const db = getDb();
    const [conflict] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, patch.slug))
      .limit(1);
    if (conflict && conflict.id !== id) {
      return apiError('slug already in use', API_STATUS.CONFLICT);
    }
  }
  if (Object.keys(patch).length === 0) {
    return apiError('No fields to update', API_STATUS.BAD_REQUEST);
  }
  await updateCompany(id, patch);
  const row = await getCompanyById(id);
  return Response.json(row);
}
