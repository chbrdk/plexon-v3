/**
 * One-time migration: Copy all users from CHECKION DB to PLEXON DB (manual only — not at container start).
 * Keeps the same user IDs so CHECKION's projects/scans still reference the same users.
 * Existing PLEXON users (same id): profile fields may update; password_hash is NEVER overwritten.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgres://..." DATABASE_URL="postgres://..." npx tsx scripts/migrate-checkion-users-to-plexon.ts
 * Or from PLEXON root with .env:
 *   MIGRATION_SOURCE_DATABASE_URL=<checkion-db> DATABASE_URL=<plexon-db> npm run migrate:checkion-users
 *
 * Optional: MIGRATION_LOG_EACH_SKIP=1 — log every skipped user; default is a short summary.
 */

import { Pool } from 'pg';

const SOURCE_URL = process.env.MIGRATION_SOURCE_DATABASE_URL || process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL;
const LOG_EACH_SKIP = ['1', 'true', 'yes'].includes(String(process.env.MIGRATION_LOG_EACH_SKIP ?? '').toLowerCase());

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  company: string | null;
  avatar_url: string | null;
  locale: string | null;
  created_at: Date;
}

async function run() {
  if (!SOURCE_URL) {
    console.error('Missing MIGRATION_SOURCE_DATABASE_URL or SOURCE_DATABASE_URL (CHECKION DB).');
    process.exit(1);
  }
  if (!TARGET_URL) {
    console.error('Missing DATABASE_URL (PLEXON DB).');
    process.exit(1);
  }

  const sourcePool = new Pool({ connectionString: SOURCE_URL, max: 2 });
  const targetPool = new Pool({ connectionString: TARGET_URL, max: 2 });

  try {
    const client = await sourcePool.connect();
    let rows: UserRow[];
    try {
      const res = await client.query<UserRow>(
        `SELECT id, email, password_hash, name, company, avatar_url, locale, created_at FROM users ORDER BY created_at`
      );
      rows = res.rows;
    } finally {
      client.release();
    }

    if (rows.length === 0) {
      console.log('No users found in source (CHECKION) database.');
      return;
    }

    console.log(`Found ${rows.length} user(s) in CHECKION. Migrating to PLEXON...`);

    const targetClient = await targetPool.connect();
    try {
      let insertedOrUpdated = 0;
      let skippedEmailConflict = 0;
      let skippedEmptyEmail = 0;
      const conflictSamples: { sourceId: string; existingId: string; email: string }[] = [];
      for (const row of rows) {
        const emailNorm = String(row.email ?? '').trim().toLowerCase();
        if (!emailNorm) {
          skippedEmptyEmail += 1;
          if (LOG_EACH_SKIP) console.warn(`Skipping source user ${row.id}: empty email`);
          continue;
        }
        const dup = await targetClient.query(`select id from users where lower(trim(email)) = $1 limit 1`, [
          emailNorm,
        ]);
        if (dup.rowCount && dup.rows[0].id !== row.id) {
          skippedEmailConflict += 1;
          if (LOG_EACH_SKIP) {
            console.warn(
              `Skipping source user ${row.id} (${row.email}): email already used by PLEXON user ${dup.rows[0].id}`
            );
          } else if (conflictSamples.length < 8) {
            conflictSamples.push({
              sourceId: row.id,
              existingId: dup.rows[0].id as string,
              email: row.email,
            });
          }
          continue;
        }
        await targetClient.query(
          `INSERT INTO users (id, email, password_hash, name, company, avatar_url, locale, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             company = EXCLUDED.company,
             avatar_url = EXCLUDED.avatar_url,
             locale = EXCLUDED.locale`,
          [
            row.id,
            row.email,
            row.password_hash,
            row.name,
            row.company,
            row.avatar_url,
            row.locale,
            row.created_at,
          ]
        );
        insertedOrUpdated += 1;
      }
      if (!LOG_EACH_SKIP && skippedEmailConflict > 0) {
        console.warn(
          `Skipped ${skippedEmailConflict} CHECKION user(s): email already exists in PLEXON under a different id. Examples:`
        );
        for (const s of conflictSamples) {
          console.warn(`  ${s.sourceId} → existing PLEXON ${s.existingId} (${s.email})`);
        }
        if (skippedEmailConflict > conflictSamples.length) {
          console.warn(`  … and ${skippedEmailConflict - conflictSamples.length} more. Set MIGRATION_LOG_EACH_SKIP=1 for every row.`);
        }
      }
      if (!LOG_EACH_SKIP && skippedEmptyEmail > 0) {
        console.warn(`Skipped ${skippedEmptyEmail} user(s) with empty email.`);
      }

      const countRes = await targetClient.query('SELECT COUNT(*)::int AS c FROM users');
      const totalInTarget = countRes.rows[0]?.c ?? 0;
      const skippedTotal = skippedEmailConflict + skippedEmptyEmail;
      console.log(
        `Done. Upserted ${insertedOrUpdated} user(s)` +
          (skippedTotal ? `, skipped ${skippedTotal} (email conflict or empty)` : '') +
          `. PLEXON users table now has ${totalInTarget} user(s).`
      );
    } finally {
      targetClient.release();
    }
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
