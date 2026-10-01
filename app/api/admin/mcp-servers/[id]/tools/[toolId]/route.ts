import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { patchMcpServerTool } from '@/lib/mcp-hub/store';

type Ctx = { params: Promise<{ id: string; toolId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { toolId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const row = await patchMcpServerTool(toolId, {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    sideEffect: typeof body.sideEffect === 'string' ? body.sideEffect : undefined,
    requireConfirm: typeof body.requireConfirm === 'boolean' ? body.requireConfirm : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
  });
  if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({ item: row });
}
