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
  if (!globalForDb.__plexonDb) globalForDb.__plexonDb = createDb();
  return globalForDb.__plexonDb.db;
}

export type Db = ReturnType<typeof createDb>['db'];
