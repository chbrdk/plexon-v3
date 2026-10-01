import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  deleteMcpServer,
  getMcpServerById,
  listMcpServerTools,
  patchMcpServer,
  toPublicMcpServer,
} from '@/lib/mcp-hub/store';
import { invalidateHubRoutingHintsCache } from '@/lib/mcp-hub/runtime';
import type { McpServerAuthConfig } from '@/lib/db/schema';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const server = await getMcpServerById(id);
  if (!server) return apiError('Not found', API_STATUS.NOT_FOUND);
  const tools = await listMcpServerTools(id);
  return NextResponse.json({
    item: toPublicMcpServer(server, tools.length),
    tools,
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
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
  try {
    const row = await patchMcpServer(id, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
      authKind: typeof body.authKind === 'string' ? body.authKind : undefined,
      authConfig:
        body.authConfig && typeof body.authConfig === 'object'
          ? (body.authConfig as McpServerAuthConfig)
          : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      productId:
        body.productId === null
          ? null
          : typeof body.productId === 'string'
            ? body.productId
            : undefined,
      routingHints: Array.isArray(body.routingHints)
        ? body.routingHints.map(String)
        : undefined,
    });
    if (!row) return apiError('Not found', API_STATUS.NOT_FOUND);
    invalidateHubRoutingHintsCache();
    const tools = await listMcpServerTools(id);
    return NextResponse.json({ item: toPublicMcpServer(row, tools.length), tools });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'patch failed', API_STATUS.BAD_REQUEST);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const ok = await deleteMcpServer(id);
  if (!ok) return apiError('Not found', API_STATUS.NOT_FOUND);
  invalidateHubRoutingHintsCache();
  return NextResponse.json({ ok: true });
}
