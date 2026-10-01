import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { ensureAudionEnvBootstrapServer, toPublicMcpServer } from '@/lib/mcp-hub/store';
import { invalidateHubRoutingHintsCache } from '@/lib/mcp-hub/runtime';

/** Idempotent env_bootstrap for suite MCPs (Wave H2: AUDION). */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  try {
    const row = await ensureAudionEnvBootstrapServer();
    invalidateHubRoutingHintsCache();
    if (!row) {
      return apiError(
        'AUDION_MCP_URL not set — nothing to bootstrap',
        API_STATUS.BAD_REQUEST
      );
    }
    return NextResponse.json({
      item: toPublicMcpServer(row, 0),
      bootstrapped: true,
    });
  } catch (e) {
    return apiError(
      e instanceof Error ? e.message : 'bootstrap failed',
      API_STATUS.BAD_REQUEST
    );
  }
}
