-- Creation Client Page Share audit events (P5)
-- Spec: specs/domain/creation-client-share.md

CREATE TABLE IF NOT EXISTS creation_client_share_events (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  share_id text NOT NULL,
  event_type text NOT NULL,
  actor_user_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creation_client_share_events_project_created_idx
  ON creation_client_share_events (platform_project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creation_client_share_events_share_created_idx
  ON creation_client_share_events (share_id, created_at DESC);
