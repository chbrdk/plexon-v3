/* ------------------------------------------------------------------ */
/*  PLEXON – GET /api/services/checkion/users (proxy to CHECKION)      */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkionFetch } from '@/lib/services/checkion-client';
import { requireAdmin } from '@/lib/auth-request-user';
import { platformJson } from '@/lib/platform-contract';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }
  const result = await checkionFetch<{ data: unknown[] }>('/api/admin/users');
  if (!result.ok) {
    return apiError(result.error ?? 'Service unavailable', result.status as 502 | 503);
  }
  return platformJson(result.data ?? { data: [] });
}
