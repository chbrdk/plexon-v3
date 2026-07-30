/**
 * Health check for Coolify/Docker and load balancers.
 * GET /api/health → 200 { status: "ok" }
 */
import { platformJson } from '@/lib/platform-contract';
import { getRuntimeMetadata } from '@/lib/runtime-metadata';

export async function GET() {
  return platformJson(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...getRuntimeMetadata(),
    },
    { status: 200 }
  );
}
