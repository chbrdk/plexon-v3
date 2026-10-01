import { handleCanvaMcpRpc, verifyCanvaMcpServiceAuth } from '@/lib/mcp-hub/canva-mcp-handler';
import { API_STATUS, apiError } from '@/lib/api-error-handler';

/** Thin Canva MCP — Spec: specs/domain/mcp-hub-canva.md */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  if (!verifyCanvaMcpServiceAuth(request)) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }
  let body: { method?: string; params?: Record<string, unknown>; id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  return handleCanvaMcpRpc(request, body);
}

export async function GET() {
  return Response.json({
    ok: true,
    name: 'plexon-canva-mcp',
    tools: ['brand_templates_list', 'design_open_url', 'design_export', 'design_autofill'],
  });
}
