import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { createMcpServer, listMcpServers, toPublicMcpServer } from '@/lib/mcp-hub/store';
import type { McpServerAuthConfig } from '@/lib/db/schema';

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  try {
    const items = await listMcpServers();
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'list failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName : slug;
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl : '';
  if (!slug || !baseUrl) {
    return apiError('slug and baseUrl required', API_STATUS.BAD_REQUEST);
  }
  try {
    const row = await createMcpServer({
      slug,
      displayName,
      baseUrl,
      authKind: typeof body.authKind === 'string' ? body.authKind : 'none',
      authConfig:
        body.authConfig && typeof body.authConfig === 'object'
          ? (body.authConfig as McpServerAuthConfig)
          : {},
      status: typeof body.status === 'string' ? body.status : 'draft',
      productId: typeof body.productId === 'string' ? body.productId : null,
      routingHints: Array.isArray(body.routingHints)
        ? body.routingHints.map(String)
        : [],
    });
    return NextResponse.json({ item: toPublicMcpServer(row, 0) }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'create failed';
    if (/unique|duplicate/i.test(message)) {
      return apiError('slug already exists', API_STATUS.CONFLICT);
    }
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
