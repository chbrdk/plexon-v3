/**
 * Health check for Coolify/Docker and load balancers.
 * GET /api/health → 200 { status: "ok", database: … }
 */
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { platformJson } from '@/lib/platform-contract';
import { getRuntimeMetadata } from '@/lib/runtime-metadata';

async function probeDatabase(): Promise<{
  configured: boolean;
  ok: boolean;
  usersSelectable: boolean;
  error: string | null;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { configured: false, ok: false, usersSelectable: false, error: 'DATABASE_URL unset' };
  }
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    try {
      await db.select({ id: users.id }).from(users).limit(1);
      return { configured: true, ok: true, usersSelectable: true, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        configured: true,
        ok: true,
        usersSelectable: false,
        error: msg.slice(0, 300),
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      configured: true,
      ok: false,
      usersSelectable: false,
      error: msg.slice(0, 300),
    };
  }
}

export async function GET() {
  const database = await probeDatabase();
  return platformJson(
    {
      status: database.ok || !database.configured ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database,
      ...getRuntimeMetadata(),
    },
    { status: 200 }
  );
}
