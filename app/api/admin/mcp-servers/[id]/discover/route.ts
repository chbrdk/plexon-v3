import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { discoverMcpHubServer } from '@/lib/mcp-hub/runtime';
import { getMcpServerById, listMcpServerTools, toPublicMcpServer } from '@/lib/mcp-hub/store';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const result = await discoverMcpHubServer(id);
  if (!result.ok) {
    if (result.error === 'not_found') return apiError('Not found', API_STATUS.NOT_FOUND);
    return apiError(result.error ?? 'discover failed', API_STATUS.BAD_REQUEST);
  }
  const server = await getMcpServerById(id);
  const tools = await listMcpServerTools(id);
  return NextResponse.json({
    ok: true,
    upserted: result.upserted,
    item: server ? toPublicMcpServer(server, tools.length) : null,
    tools,
  });
}
