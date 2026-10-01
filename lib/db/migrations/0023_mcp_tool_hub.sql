-- MCP Tool Hub registry (Wave H1).
-- Spec: specs/domain/mcp-tool-hub.md

CREATE TABLE IF NOT EXISTS mcp_servers (
  id text PRIMARY KEY,
  slug text NOT NULL,
  display_name text NOT NULL,
  base_url text NOT NULL,
  transport text NOT NULL DEFAULT 'streamable_http',
  auth_kind text NOT NULL DEFAULT 'none',
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  source text NOT NULL DEFAULT 'manual',
  product_id text,
  routing_hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_discovery_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_servers_slug_uq ON mcp_servers (slug);
CREATE INDEX IF NOT EXISTS mcp_servers_status_idx ON mcp_servers (status);

CREATE TABLE IF NOT EXISTS mcp_server_tools (
  id text PRIMARY KEY,
  server_id text NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  mcp_name text NOT NULL,
  exposed_name text NOT NULL,
  description text,
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  side_effect text NOT NULL DEFAULT 'read',
  require_confirm boolean NOT NULL DEFAULT false,
  capability_id text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_server_tools_server_mcp_uq
  ON mcp_server_tools (server_id, mcp_name);
CREATE UNIQUE INDEX IF NOT EXISTS mcp_server_tools_exposed_uq
  ON mcp_server_tools (exposed_name);
CREATE INDEX IF NOT EXISTS mcp_server_tools_server_idx
  ON mcp_server_tools (server_id);
