/* ------------------------------------------------------------------ */
/*  PLEXON – GET/PATCH/DELETE /api/services/checkion/users/[id]        */
/* ------------------------------------------------------------------ */

import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkionFetch } from '@/lib/services/checkion-client';
import { requireAdmin } from '@/lib/auth-request-user';
import { platformJson } from '@/lib/platform-contract';

function forbidden() {
  return apiError('Forbidden', API_STATUS.FORBIDDEN);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  const result = await checkionFetch<{ user: unknown }>(`/api/admin/users/${encodeURIComponent(id)}`);
  if (!result.ok) return apiError(result.error ?? 'Not found', result.status as number);
  return platformJson(result.data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const result = await checkionFetch<{ user: unknown }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!result.ok) return apiError(result.error ?? 'Update failed', result.status as number);
  return platformJson(result.data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  const result = await checkionFetch<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!result.ok) return apiError(result.error ?? 'Delete failed', result.status as number);
  return platformJson(result.data ?? { success: true });
}
