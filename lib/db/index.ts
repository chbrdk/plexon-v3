/* ------------------------------------------------------------------ */
/*  PLEXON – Database client (PostgreSQL)                             */
/* ------------------------------------------------------------------ */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

const globalForDb = globalThis as unknown as { __plexonDb: ReturnType<typeof createDb> | undefined };

export function getDb() {
  if (!globalForDb.__plexonDb) {
    globalForDb.__plexonDb = createDb();
    // Boot outbox drain on first DB use (server-only). Do not start from
    // instrumentation.ts — Edge bundling vs webpackIgnore both break Coolify.
    void import('@/lib/platform-outbox-scheduler')
      .then((m) => m.startPlatformOutboxDrainScheduler())
      .catch((e) => {
        console.warn(
          '[PLEXON] outbox scheduler boot failed',
          e instanceof Error ? e.message : e
        );
      });
  }
  return globalForDb.__plexonDb.db;
}

export type Db = ReturnType<typeof createDb>['db'];
