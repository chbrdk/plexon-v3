import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { createCompany, listCompanies } from '@/lib/db/companies';
import { getDb } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const rows = await listCompanies();
  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  let body: { name?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return apiError('name is required', API_STATUS.BAD_REQUEST);
  }
  const slug =
    typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : null;
  if (slug) {
    const db = getDb();
    const [existing] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
    if (existing) {
      return apiError('slug already in use', API_STATUS.CONFLICT);
    }
  }
  const id = randomUUID();
  await createCompany({ id, name: body.name, slug });
  const db = getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return Response.json(row, { status: 201 });
}
