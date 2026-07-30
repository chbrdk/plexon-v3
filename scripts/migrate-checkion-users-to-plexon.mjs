/**
 * One-time migration: CHECKION users → PLEXON (manual only — never run from docker-entrypoint).
 * Run: node scripts/migrate-checkion-users-to-plexon.mjs
 * Env: DATABASE_URL (PLEXON), MIGRATION_SOURCE_DATABASE_URL or SOURCE_DATABASE_URL (CHECKION).
 * Existing PLEXON users (same id): profile fields may update; password_hash is NEVER overwritten.
 * Optional: MIGRATION_LOG_EACH_SKIP=1 — log every skipped user line.
 */

import pg from 'pg';
const { Pool } = pg;

const SOURCE_URL = process.env.MIGRATION_SOURCE_DATABASE_URL || process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL;
const LOG_EACH_SKIP = ['1', 'true', 'yes'].includes(String(process.env.MIGRATION_LOG_EACH_SKIP ?? '').toLowerCase());

async function run() {
  if (!SOURCE_URL) {
    console.error('[PLEXON] MIGRATION_SOURCE_DATABASE_URL not set, skipping user migration.');
    process.exit(0);
  }
  if (!TARGET_URL) {
    console.error('[PLEXON] DATABASE_URL not set, skipping user migration.');
    process.exit(0);
  }

  const sourcePool = new Pool({ connectionString: SOURCE_URL, max: 2 });
  const targetPool = new Pool({ connectionString: TARGET_URL, max: 2 });

  try {
    const client = await sourcePool.connect();
    let rows;
    try {
      const res = await client.query(
        'SELECT id, email, password_hash, name, company, avatar_url, locale, created_at FROM users ORDER BY created_at'
      );
      rows = res.rows;
    } finally {
      client.release();
    }

    if (rows.length === 0) {
      console.log('[PLEXON] No users in source DB, migration skipped.');
      return;
    }

    console.log(`[PLEXON] Migrating ${rows.length} user(s) from CHECKION to PLEXON...`);
    const targetClient = await targetPool.connect();
    try {
      let insertedOrUpdated = 0;
      let skippedEmailConflict = 0;
      let skippedEmptyEmail = 0;
      /** For summary log when !LOG_EACH_SKIP */
      const conflictSamples = [];
      for (const row of rows) {
        const emailNorm = String(row.email ?? '').trim().toLowerCase();
        if (!emailNorm) {
          skippedEmptyEmail += 1;
          if (LOG_EACH_SKIP) console.warn(`[PLEXON] Skipping source user ${row.id}: empty email`);
          continue;
        }
        const dup = await targetClient.query(
          `select id from users where lower(trim(email)) = $1 limit 1`,
          [emailNorm]
        );
        if (dup.rowCount && dup.rows[0].id !== row.id) {
          skippedEmailConflict += 1;
          if (LOG_EACH_SKIP) {
            console.warn(
              `[PLEXON] Skipping source user ${row.id} (${row.email}): email already used by PLEXON user ${dup.rows[0].id} (same mailbox, different id — resolve manually if CHECKION must use this id).`
            );
          } else if (conflictSamples.length < 8) {
            conflictSamples.push({
              sourceId: row.id,
              existingId: dup.rows[0].id,
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
          `[PLEXON] Skipped ${skippedEmailConflict} CHECKION user(s): email already exists in PLEXON under a different user id (CHECKION still references the CHECKION user id). Examples:`
        );
        for (const s of conflictSamples) {
          console.warn(`[PLEXON]   ${s.sourceId} → existing PLEXON ${s.existingId} (${s.email})`);
        }
        if (skippedEmailConflict > conflictSamples.length) {
          console.warn(
            `[PLEXON]   … and ${skippedEmailConflict - conflictSamples.length} more. Set MIGRATION_LOG_EACH_SKIP=1 for every row.`
          );
        }
      }
      if (!LOG_EACH_SKIP && skippedEmptyEmail > 0) {
        console.warn(`[PLEXON] Skipped ${skippedEmptyEmail} user(s) with empty email.`);
      }

      const countRes = await targetClient.query('SELECT COUNT(*)::int AS c FROM users');
      const totalInTarget = countRes.rows[0]?.c ?? 0;
      const skippedTotal = skippedEmailConflict + skippedEmptyEmail;
      console.log(
        `[PLEXON] Migration done. Upserted ${insertedOrUpdated} user(s)` +
          (skippedTotal ? `, skipped ${skippedTotal} (email conflict or empty email)` : '') +
          `. PLEXON users: ${totalInTarget}.`
      );
    } finally {
      targetClient.release();
    }
  } catch (e) {
    console.error('[PLEXON] User migration failed:', e.message);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

run();
