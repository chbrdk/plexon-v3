-- MCP Tool Hub Wave H4 — Collection-level Hub server enable.
-- Spec: specs/domain/mcp-hub-collection-scope.md

CREATE TABLE IF NOT EXISTS mcp_collection_servers (
  id text PRIMARY KEY,
  platform_project_id text NOT NULL,
  server_id text NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_collection_servers_project_server_uq
  ON mcp_collection_servers (platform_project_id, server_id);

CREATE INDEX IF NOT EXISTS mcp_collection_servers_project_idx
  ON mcp_collection_servers (platform_project_id);
