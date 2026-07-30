import pg from 'pg';

import {
  getAudionProductDatabaseUrl,
  getAudionProductSchema,
  getCheckionProductDatabaseUrl,
} from '@/lib/admin-product-db-catalog';

const { Pool } = pg;

const AUDION_SCHEMA_RE = /^[_a-z][_a-z0-9]*$/i;

export type CheckionUserProjectInsightRow = {
  id: string;
  name: string;
  domain: string | null;
  platformProjectId: string | null;
  platformCompanyId: string | null;
  scanCount: number;
};

export type AudionUserProjectInsightRow = {
  id: string;
  name: string;
  platformProjectId: string | null;
  platformCompanyId: string | null;
  checkionProjectId: string | null;
  personaCount: number;
};

/**
 * CHECKION projects the PLEXON user can open (owner or active member). `user_id` / `project_members.user_id`
 * are PLEXON ids when using central auth.
 */
export async function fetchCheckionUserProjectsForInsights(plexonUserId: string): Promise<CheckionUserProjectInsightRow[]> {
  const url = getCheckionProductDatabaseUrl();
  if (!url) return [];
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await pool.query<{
      id: string;
      name: string;
      domain: string | null;
      platform_project_id: string | null;
      platform_company_id: string | null;
      scan_count: string;
    }>(
      `
      select
        p.id,
        p.name,
        p.domain,
        p.platform_project_id,
        p.platform_company_id,
        coalesce(
          (select count(*)::int from scans s where s.project_id = p.id),
          0
        )::text as scan_count
      from projects p
      where p.user_id = $1
         or exists (
           select 1 from project_members pm
           where pm.project_id = p.id
             and pm.user_id = $1
             and pm.status = 'active'
         )
      order by lower(p.name) asc nulls last, p.id asc
      limit 500
      `,
      [plexonUserId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      domain: r.domain,
      platformProjectId: r.platform_project_id,
      platformCompanyId: r.platform_company_id,
      scanCount: Number.parseInt(r.scan_count, 10) || 0,
    }));
  } catch (e) {
    console.error('[PLEXON] fetchCheckionUserProjectsForInsights failed:', e);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * AUDION projects for users linked by `audion.users.plexon_user_id`, including active memberships and
 * `platform_managed_project_memberships` when that table exists.
 */
export async function fetchAudionUserProjectsForInsights(plexonUserId: string): Promise<AudionUserProjectInsightRow[]> {
  const url = getAudionProductDatabaseUrl();
  if (!url) return [];
  const schema = getAudionProductSchema();
  if (!AUDION_SCHEMA_RE.test(schema)) {
    console.error('[PLEXON] invalid MIGRATION_AUDION_SCHEMA for user insights:', schema);
    return [];
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const sql = `
    select
      pr.id::text as id,
      pr.name,
      pr.platform_project_id,
      pr.platform_company_id,
      pr.checkion_project_id,
      coalesce(
        (select count(*)::int from ${schema}.personas pe where pe.project_id = pr.id),
        0
      )::text as persona_count
    from ${schema}.projects pr
    where exists (
      select 1 from ${schema}.users u
      where u.plexon_user_id = $1 and pr.owner_user_id = u.id
    )
    or exists (
      select 1 from ${schema}.project_members pm
      join ${schema}.users u on u.id = pm.user_id
      where pm.project_id = pr.id
        and pm.status = 'active'
        and u.plexon_user_id = $1
    )
    or exists (
      select 1 from ${schema}.platform_managed_project_memberships pmm
      where pmm.project_id = pr.id and pmm.plexon_user_id = $1
    )
    order by lower(pr.name) asc nulls last, pr.id asc
    limit 500
  `;
  try {
    const res = await pool.query<{
      id: string;
      name: string;
      platform_project_id: string | null;
      platform_company_id: string | null;
      checkion_project_id: string | null;
      persona_count: string;
    }>(sql, [plexonUserId]);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      platformProjectId: r.platform_project_id,
      platformCompanyId: r.platform_company_id,
      checkionProjectId: r.checkion_project_id,
      personaCount: Number.parseInt(r.persona_count, 10) || 0,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('platform_managed_project_memberships')) {
      try {
        const res = await pool.query<{
          id: string;
          name: string;
          platform_project_id: string | null;
          platform_company_id: string | null;
          checkion_project_id: string | null;
          persona_count: string;
        }>(
          `
          select
            pr.id::text as id,
            pr.name,
            pr.platform_project_id,
            pr.platform_company_id,
            pr.checkion_project_id,
            coalesce(
              (select count(*)::int from ${schema}.personas pe where pe.project_id = pr.id),
              0
            )::text as persona_count
          from ${schema}.projects pr
          where exists (
            select 1 from ${schema}.users u
            where u.plexon_user_id = $1 and pr.owner_user_id = u.id
          )
          or exists (
            select 1 from ${schema}.project_members pm
            join ${schema}.users u on u.id = pm.user_id
            where pm.project_id = pr.id
              and pm.status = 'active'
              and u.plexon_user_id = $1
          )
          order by lower(pr.name) asc nulls last, pr.id asc
          limit 500
          `,
          [plexonUserId]
        );
        return res.rows.map((r) => ({
          id: r.id,
          name: r.name,
          platformProjectId: r.platform_project_id,
          platformCompanyId: r.platform_company_id,
          checkionProjectId: r.checkion_project_id,
          personaCount: Number.parseInt(r.persona_count, 10) || 0,
        }));
      } catch (e2) {
        console.error('[PLEXON] fetchAudionUserProjectsForInsights (fallback) failed:', e2);
        return [];
      }
    }
    console.error('[PLEXON] fetchAudionUserProjectsForInsights failed:', e);
    return [];
  } finally {
    await pool.end();
  }
}
