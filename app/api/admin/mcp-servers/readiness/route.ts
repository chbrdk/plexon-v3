import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import { getMcpHubReadiness } from '@/lib/mcp-hub/readiness';

/** Wave H5 — Canva / Hub staging readiness (booleans only). */
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const readiness = await getMcpHubReadiness();
  return NextResponse.json(readiness);
}
