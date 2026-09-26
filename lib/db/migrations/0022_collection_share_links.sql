-- Collection Share Links registry (metadata only; no tokens).
-- Spec: specs/domain/collection-share-links.md

CREATE TABLE IF NOT EXISTS collection_share_links (
  product_id text NOT NULL,
  share_id text NOT NULL,
  platform_project_id text NOT NULL REFERENCES platform_projects (id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  href text,
  expires_at timestamptz,
  revoked_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, share_id)
);

CREATE INDEX IF NOT EXISTS collection_share_links_project_idx
  ON collection_share_links (platform_project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS collection_share_links_project_active_idx
  ON collection_share_links (platform_project_id)
  WHERE revoked_at IS NULL;
