CREATE TABLE IF NOT EXISTS collection_invites (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL REFERENCES platform_projects(id) ON DELETE CASCADE,
  created_by_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  scene_id text,
  expires_at timestamptz NOT NULL,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collection_invites_project_idx ON collection_invites (platform_project_id);
CREATE UNIQUE INDEX IF NOT EXISTS collection_invites_token_hash_uidx ON collection_invites (token_hash);
