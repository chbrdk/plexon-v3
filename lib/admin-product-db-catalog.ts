import pg from 'pg';

const { Pool } = pg;

const AUDION_SCHEMA_RE = /^[_a-z][_a-z0-9]*$/i;

/** CHECKION Postgres URL when PLEXON should read product data (same env keys as migrations). */
export function getCheckionProductDatabaseUrl(): string | null {
  return (
    process.env.CHECKION_DATABASE_URL?.trim() ||
    process.env.MIGRATION_CHECKION_DATABASE_URL?.trim() ||
    null
  );
}

/** AUDION Postgres URL when PLEXON should read product data (same env keys as migrations). */
export function getAudionProductDatabaseUrl(): string | null {
  return (
    process.env.AUDION_DATABASE_URL?.trim() ||
    process.env.MIGRATION_AUDION_DATABASE_URL?.trim() ||
    null
  );
}

export function getAudionProductSchema(): string {
  return (process.env.MIGRATION_AUDION_SCHEMA ?? 'audion').trim();
}

/**
 * All CHECKION `projects` rows (the same ids used in entitlements / provisioning).
 * Read-only; used when PLEXON has DB URL so admins see projects even without platform bindings.
 */
export async function fetchCheckionProjectsFromProductDb(): Promise<
  Array<{ id: string; name: string; domain: string | null }>
> {
  const url = getCheckionProductDatabaseUrl();
  if (!url) return [];
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await pool.query<{ id: string; name: string; domain: string | null }>(
      `select id, name, domain from projects order by lower(name) asc limit 2000`
    );
    return res.rows;
  } catch (e) {
    console.error('[PLEXON] fetchCheckionProjectsFromProductDb failed:', e);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * All AUDION `projects` rows (schema configurable, default `audion`).
 */
export async function fetchAudionProjectsFromProductDb(): Promise<Array<{ id: string; name: string }>> {
  const url = getAudionProductDatabaseUrl();
  if (!url) return [];
  const schema = getAudionProductSchema();
  if (!AUDION_SCHEMA_RE.test(schema)) {
    console.error('[PLEXON] invalid MIGRATION_AUDION_SCHEMA for catalog:', schema);
    return [];
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await pool.query<{ id: string; name: string }>(
      `select id::text as id, name from ${schema}.projects order by lower(name) asc limit 2000`
    );
    return res.rows;
  } catch (e) {
    console.error('[PLEXON] fetchAudionProjectsFromProductDb failed:', e);
    return [];
  } finally {
    await pool.end();
  }
}
