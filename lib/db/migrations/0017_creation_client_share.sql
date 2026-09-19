-- Creation Client Page Share policy + inventory projection (P2)
-- Spec: specs/domain/creation-client-share.md

CREATE TABLE IF NOT EXISTS collection_client_share_policies (
  platform_project_id text PRIMARY KEY REFERENCES platform_projects(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  allow_public_link boolean NOT NULL DEFAULT false,
  require_password boolean NOT NULL DEFAULT true,
  max_ttl_days integer,
  allow_live_head boolean NOT NULL DEFAULT true,
  allow_email_allowlist boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id text
);

CREATE TABLE IF NOT EXISTS creation_client_share_projections (
  share_id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  scene_id text NOT NULL,
  page_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_mode text NOT NULL,
  content_mode text NOT NULL,
  label text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creation_client_share_projections_project_idx
  ON creation_client_share_projections (platform_project_id);
