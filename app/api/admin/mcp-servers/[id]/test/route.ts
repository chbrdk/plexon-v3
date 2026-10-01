import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { testMcpHubServer } from '@/lib/mcp-hub/runtime';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { id } = await ctx.params;
  const result = await testMcpHubServer(id);
  if (result.error === 'not_found') return apiError('Not found', API_STATUS.NOT_FOUND);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, sessionId: result.sessionId });
}
