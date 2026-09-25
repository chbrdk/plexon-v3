-- Enterprise E1 activity distillates, E7 CampaignBrief, E9 directory stub
-- Spec: specs/domain/suite-enterprise-program.md

CREATE TABLE IF NOT EXISTS collection_activity_items (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL,
  subject_ref text NOT NULL,
  title text NOT NULL,
  href text,
  at timestamptz NOT NULL DEFAULT now(),
  actor_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collection_activity_items_project_at_idx
  ON collection_activity_items (platform_project_id, at DESC);

CREATE TABLE IF NOT EXISTS collection_campaign_briefs (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  market_ref text,
  persona_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  guideline_id text,
  page_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  scene_id text,
  media_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  kpi_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  spirion_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collection_campaign_briefs_project_idx
  ON collection_campaign_briefs (platform_project_id);

CREATE TABLE IF NOT EXISTS company_directory_settings (
  company_id text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'none',
  password_login_disabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  scim_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
