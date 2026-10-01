import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  ensureAudionEnvBootstrapServer,
  ensureCanvaHubBootstrapServer,
  toPublicMcpServer,
} from '@/lib/mcp-hub/store';
import { invalidateHubRoutingHintsCache } from '@/lib/mcp-hub/runtime';

/** Idempotent env_bootstrap for suite / Canva Hub servers (H2–H3). */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const kind = typeof body.kind === 'string' ? body.kind : 'all';
  try {
    const items: Array<ReturnType<typeof toPublicMcpServer>> = [];
    if (kind === 'audion' || kind === 'all') {
      const row = await ensureAudionEnvBootstrapServer();
      if (row) items.push(toPublicMcpServer(row, 0));
    }
    if (kind === 'canva' || kind === 'all') {
      const row = await ensureCanvaHubBootstrapServer();
      if (row) items.push(toPublicMcpServer(row, 0));
    }
    invalidateHubRoutingHintsCache();
    if (!items.length) {
      return apiError(
        'Nothing to bootstrap — set AUDION_MCP_URL and/or NEXTAUTH_URL/PUBLIC_APP_URL',
        API_STATUS.BAD_REQUEST
      );
    }
    return NextResponse.json({ items, bootstrapped: true });
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : 'bootstrap failed',
      API_STATUS.BAD_REQUEST
    );
  }
}
