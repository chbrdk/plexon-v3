-- Enterprise E2 ClientRoom + E4 Suite Audit
-- Spec: specs/domain/suite-enterprise-program.md

CREATE TABLE IF NOT EXISTS collection_client_rooms (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  password_hash text,
  expires_at timestamptz,
  revoked_at timestamptz,
  revision integer NOT NULL DEFAULT 1,
  slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collection_client_rooms_token_hash_uidx
  ON collection_client_rooms (token_hash);
CREATE INDEX IF NOT EXISTS collection_client_rooms_project_idx
  ON collection_client_rooms (platform_project_id);

CREATE TABLE IF NOT EXISTS suite_audit_events (
  id text PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_user_id text NOT NULL,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  action text NOT NULL,
  subject_ref text,
  model_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS suite_audit_events_project_at_idx
  ON suite_audit_events (platform_project_id, at DESC);
CREATE INDEX IF NOT EXISTS suite_audit_events_actor_idx
  ON suite_audit_events (actor_user_id, at DESC);
