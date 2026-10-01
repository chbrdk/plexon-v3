-- MCP Tool Hub Wave H3 — OAuth bindings + pending PKCE state.
-- Spec: specs/domain/mcp-tool-hub.md · specs/domain/mcp-hub-canva.md

CREATE TABLE IF NOT EXISTS mcp_oauth_bindings (
  id text PRIMARY KEY,
  server_id text NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  company_id text,
  access_token_enc text NOT NULL,
  refresh_token_enc text,
  expires_at timestamptz,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_oauth_bindings_server_user_uq
  ON mcp_oauth_bindings (server_id, user_id);

CREATE INDEX IF NOT EXISTS mcp_oauth_bindings_user_idx
  ON mcp_oauth_bindings (user_id);

CREATE TABLE IF NOT EXISTS mcp_oauth_pending (
  state text PRIMARY KEY,
  server_id text NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  code_verifier text NOT NULL,
  return_path text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mcp_oauth_pending_expires_idx
  ON mcp_oauth_pending (expires_at);
