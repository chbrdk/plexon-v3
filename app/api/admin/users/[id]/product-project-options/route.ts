import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { listAdminProductProjectPickerItems } from '@/lib/admin-product-project-options';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function ensureUserExists(userId: string) {
  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', API_STATUS.UNAVAILABLE);

  const { id } = await ctx.params;
  const user = await ensureUserExists(id);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);

  const url = new URL(request.url);
  const productId = url.searchParams.get('productId')?.trim();
  if (productId !== 'checkion' && productId !== 'audion') {
    return apiError('productId must be checkion or audion', API_STATUS.BAD_REQUEST);
  }

  const items = await listAdminProductProjectPickerItems(id, productId);
  return Response.json({ userId: id, productId, items });
}
