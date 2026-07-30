/* ------------------------------------------------------------------ */
/*  PLEXON – DELETE /api/auth/tokens/[id] (revoke API token)          */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { revokeApiToken } from '@/lib/db/api-tokens';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(_request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (user.id === 'demo') return apiError('Demo user cannot revoke tokens', API_STATUS.BAD_REQUEST);
  const { id } = await params;
  if (!id) return apiError('Token ID required', API_STATUS.BAD_REQUEST);
  const revoked = await revokeApiToken(id, user.id);
  if (!revoked) return apiError('Token not found or already revoked', API_STATUS.NOT_FOUND);
  return NextResponse.json({ success: true });
}
