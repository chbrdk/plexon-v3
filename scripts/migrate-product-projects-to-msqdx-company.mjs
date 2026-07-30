/**
 * Migration: CHECKION + AUDION projects → PLEXON `platform_projects` (target company, default msqdx)
 * + `platform_project_product_bindings` (admin entitlement pickers).
 *
 * Coolify: set `MIGRATION_MSQDX_PLATFORM_PROJECTS=1` and DB URLs on the PLEXON service; on each
 * container start `docker-entrypoint.sh` runs this script (idempotent skips). After a successful
 * run, set the flag back to `0` or remove it so deploys stay quiet.
 *
 * Env:
 *   DATABASE_URL, CHECKION_DATABASE_URL (or MIGRATION_CHECKION_DATABASE_URL),
 *   AUDION_DATABASE_URL (or MIGRATION_AUDION_DATABASE_URL)
 * Optional: MIGRATION_COMPANY_SLUG, MIGRATION_AUDION_SCHEMA, DRY_RUN
 */

import { randomUUID } from 'crypto';
import pg from 'pg';

const { Pool } = pg;

const PLEXON_URL = process.env.DATABASE_URL;
const CHECKION_URL = process.env.CHECKION_DATABASE_URL ?? process.env.MIGRATION_CHECKION_DATABASE_URL;
const AUDION_URL = process.env.AUDION_DATABASE_URL ?? process.env.MIGRATION_AUDION_DATABASE_URL;
const COMPANY_SLUG = (process.env.MIGRATION_COMPANY_SLUG ?? 'msqdx').trim().toLowerCase();
const AUDION_SCHEMA = (process.env.MIGRATION_AUDION_SCHEMA ?? 'audion').trim();
const DRY_RUN = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN ?? '').toLowerCase());

if (!/^[_a-z][_a-z0-9]*$/i.test(AUDION_SCHEMA)) {
  throw new Error(`Invalid MIGRATION_AUDION_SCHEMA: ${AUDION_SCHEMA}`);
}

async function resolveCompanyId(plexon) {
  const res = await plexon.query(
    `select id, slug, name from companies
     where lower(trim(coalesce(slug, ''))) = $1 or lower(trim(coalesce(name, ''))) = $1`,
    [COMPANY_SLUG]
  );
  if (!res.rowCount) {
    throw new Error(`No company found for slug/name "${COMPANY_SLUG}". Create the company in PLEXON first.`);
  }
  if (res.rowCount > 1) {
    throw new Error(`Multiple companies match "${COMPANY_SLUG}" — refine MIGRATION_COMPANY_SLUG.`);
  }
  return res.rows[0];
}

async function resolveCreatedByUserId(plexon, companyId, preferred) {
  if (preferred) {
    const u = await plexon.query(`select id from users where id = $1 limit 1`, [preferred]);
    if (u.rowCount) return preferred;
  }
  const member = await plexon.query(
    `select user_id from company_users
     where company_id = $1
     order by case role when 'owner' then 0 when 'admin' then 1 else 2 end, user_id
     limit 1`,
    [companyId]
  );
  if (member.rowCount) return member.rows[0].user_id;
  const admin = await plexon.query(`select id from users where role = 'admin' order by created_at limit 1`);
  if (!admin.rowCount) {
    throw new Error('No PLEXON user available for created_by_user_id (add a company member or admin user).');
  }
  return admin.rows[0].id;
}

async function upsertBindings(client, platformProjectId, checkionExternal, audionExternal) {
  const now = new Date();
  const rows = [
    { productId: 'checkion', external: checkionExternal, sync: checkionExternal ? 'in_sync' : 'pending' },
    { productId: 'audion', external: audionExternal, sync: audionExternal ? 'in_sync' : 'pending' },
  ];
  for (const r of rows) {
    await client.query(
      `insert into platform_project_product_bindings
        (platform_project_id, product_id, external_project_id, sync_status, sync_message, last_sync_at, created_at, updated_at)
       values ($1, $2, $3, $4, null, $5, $6, $6)
       on conflict (platform_project_id, product_id) do update set
         external_project_id = excluded.external_project_id,
         sync_status = excluded.sync_status,
         sync_message = null,
         last_sync_at = excluded.last_sync_at,
         updated_at = excluded.updated_at`,
      [platformProjectId, r.productId, r.external, r.sync, r.external ? now : null, now]
    );
  }
}

async function run() {
  if (!PLEXON_URL) {
    console.warn('[plexon-msqdx] DATABASE_URL missing — skipping platform project migration.');
    return;
  }
  if (!CHECKION_URL || !AUDION_URL) {
    console.warn(
      '[plexon-msqdx] Skipping platform project migration: need both CHECKION_DATABASE_URL (or MIGRATION_CHECKION_DATABASE_URL) and AUDION_DATABASE_URL (or MIGRATION_AUDION_DATABASE_URL) reachable from this container.' +
        ` (checkion=${Boolean(CHECKION_URL)}, audion=${Boolean(AUDION_URL)})`
    );
    return;
  }

  const plexon = new Pool({ connectionString: PLEXON_URL, max: 3 });
  const checkion = new Pool({ connectionString: CHECKION_URL, max: 3 });
  const audion = new Pool({ connectionString: AUDION_URL, max: 3 });

  try {
    const company = await resolveCompanyId(plexon);
    console.log(`[plexon] company ${company.name} (${company.id}) slug=${company.slug ?? '—'}`);

    const chkRes = await checkion.query(
      `select id, user_id, name, domain, platform_project_id from projects order by created_at`
    );
    console.log(`[checkion] projects: ${chkRes.rowCount}`);

    const audSql = `select id::text, name, owner_user_id::text, checkion_project_id::text, platform_project_id::text
                    from ${AUDION_SCHEMA}.projects order by created_at`;
    const audRes = await audion.query(audSql);
    console.log(`[audion] projects: ${audRes.rowCount}`);

    const checkionToPlatform = new Map();

    for (const row of chkRes.rows) {
      if (row.platform_project_id?.trim()) {
        const existing = await plexon.query(`select id from platform_projects where id = $1`, [
          row.platform_project_id.trim(),
        ]);
        if (existing.rowCount) {
          const existingId = row.platform_project_id.trim();
          checkionToPlatform.set(row.id, existingId);
          console.log(`[checkion] skip ${row.id} — already linked to platform ${existingId}`);
          continue;
        }
      }

      const platformId = randomUUID();
      const ownerId = await resolveCreatedByUserId(plexon, company.id, row.user_id);

      console.log(
        `[checkion] ${DRY_RUN ? 'dry-run ' : ''}create platform ${platformId} ← project ${row.id} (${row.name})`
      );
      if (!DRY_RUN) {
        await plexon.query(
          `insert into platform_projects
            (id, company_id, name, domain, metadata, status, created_by_user_id, created_at, updated_at)
           values ($1, $2, $3, $4, null, 'active', $5, now(), now())`,
          [platformId, company.id, row.name, row.domain ?? null, ownerId]
        );
        await upsertBindings(plexon, platformId, row.id, null);
        await checkion.query(
          `update projects set platform_project_id = $1, platform_company_id = $2 where id = $3`,
          [platformId, company.id, row.id]
        );
      }
      checkionToPlatform.set(row.id, platformId);
    }

    for (const row of audRes.rows) {
      let platformId = row.platform_project_id?.trim() || null;

      if (platformId) {
        const ok = await plexon.query(`select 1 from platform_projects where id = $1`, [platformId]);
        if (ok.rowCount) {
          console.log(`[audion] skip ${row.id} — already has platform ${platformId}`);
          continue;
        }
        platformId = null;
      }

      const chk = row.checkion_project_id?.trim();
      if (chk && checkionToPlatform.has(chk)) {
        platformId = checkionToPlatform.get(chk);
        console.log(
          `[audion] ${DRY_RUN ? 'dry-run ' : ''}bind ${row.id} (${row.name}) → platform ${platformId} (via checkion ${chk})`
        );
        if (!DRY_RUN) {
          await upsertBindings(plexon, platformId, chk, row.id);
          await audion.query(
            `update ${AUDION_SCHEMA}.projects set platform_project_id = $1, platform_company_id = $2 where id = $3::uuid`,
            [platformId, company.id, row.id]
          );
        }
        continue;
      }

      const standaloneId = randomUUID();
      const ownerId = await resolveCreatedByUserId(plexon, company.id, row.owner_user_id);
      console.log(
        `[audion] ${DRY_RUN ? 'dry-run ' : ''}standalone platform ${standaloneId} ← ${row.id} (${row.name})`
      );
      if (!DRY_RUN) {
        await plexon.query(
          `insert into platform_projects
            (id, company_id, name, domain, metadata, status, created_by_user_id, created_at, updated_at)
           values ($1, $2, $3, null, null, 'active', $4, now(), now())`,
          [standaloneId, company.id, row.name, ownerId]
        );
        await upsertBindings(plexon, standaloneId, null, row.id);
        await audion.query(
          `update ${AUDION_SCHEMA}.projects set platform_project_id = $1, platform_company_id = $2 where id = $3::uuid`,
          [standaloneId, company.id, row.id]
        );
      }
    }

    console.log(DRY_RUN ? 'Dry run finished (no writes).' : 'Migration finished.');
  } finally {
    await plexon.end();
    await checkion.end();
    await audion.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
