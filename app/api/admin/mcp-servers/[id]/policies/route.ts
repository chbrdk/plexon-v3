import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  listMcpPoliciesForServer,
  upsertOrgServerPolicy,
} from '@/lib/mcp-hub/store';
import { invalidateHubRoutingHintsCache } from '@/lib/mcp-hub/runtime';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const policies = await listMcpPoliciesForServer(id);
  return NextResponse.json({ items: policies });
}

export async function PUT(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const effect = body.effect === 'deny' ? 'deny' : 'allow';
  const allowWrite = body.allowWrite !== false;
  try {
    const row = await upsertOrgServerPolicy({
      serverId: id,
      effect,
      allowWrite,
    });
    invalidateHubRoutingHintsCache();
    return NextResponse.json({ item: row });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'policy upsert failed', API_STATUS.BAD_REQUEST);
  }
}
