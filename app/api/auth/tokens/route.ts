/* ------------------------------------------------------------------ */
/*  PLEXON – GET/POST /api/auth/tokens (API token management)           */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listApiTokens, createApiToken } from '@/lib/db/api-tokens';

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (user.id === 'demo') return NextResponse.json({ data: [] });
  const tokens = await listApiTokens(user.id);
  return NextResponse.json({
    data: tokens.map((t) => ({
      id: t.id,
      name: t.name ?? undefined,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (user.id === 'demo') return apiError('Demo user cannot create API tokens', API_STATUS.BAD_REQUEST);
  let body: { name?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const name = typeof body?.name === 'string' ? body.name.trim() || undefined : undefined;
  const created = await createApiToken(user.id, name ?? null);
  return NextResponse.json({
    token: created.token,
    id: created.id,
    name: created.name ?? undefined,
    createdAt: created.createdAt.toISOString(),
  });
}
