import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { bulkReplaceCompanyFields } from '@/lib/db/companies';

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  if (!Array.isArray(body.items)) {
    return apiError('items must be an array', API_STATUS.BAD_REQUEST);
  }
  if (body.items.length === 0) {
    return apiError('items must not be empty', API_STATUS.BAD_REQUEST);
  }

  const items: Array<{ id: string; name: string; slug: string | null }> = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') {
      return apiError('Each item must be an object', API_STATUS.BAD_REQUEST);
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id.trim()) {
      return apiError('Invalid company id', API_STATUS.BAD_REQUEST);
    }
    if (typeof row.name !== 'string') {
      return apiError('Invalid name', API_STATUS.BAD_REQUEST);
    }
    let slug: string | null = null;
    if (row.slug !== undefined && row.slug !== null) {
      if (typeof row.slug !== 'string') {
        return apiError('Invalid slug', API_STATUS.BAD_REQUEST);
      }
      slug = row.slug.trim() ? row.slug.trim().toLowerCase() : null;
    }
    items.push({ id: row.id.trim(), name: row.name, slug });
  }

  try {
    await bulkReplaceCompanyFields(items);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bulk update failed';
    if (message === 'One or more companies not found') {
      return apiError(message, API_STATUS.NOT_FOUND);
    }
    return apiError(message, API_STATUS.BAD_REQUEST);
  }

  return Response.json({ ok: true, updated: items.length });
}
