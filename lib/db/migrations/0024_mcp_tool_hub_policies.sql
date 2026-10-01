-- MCP Tool Hub Wave H2 — org/server/tool policies.
-- Spec: specs/domain/mcp-tool-hub.md

CREATE TABLE IF NOT EXISTS mcp_tool_policies (
  id text PRIMARY KEY,
  scope text NOT NULL DEFAULT 'org',
  scope_id text,
  server_id text NOT NULL REFERENCES mcp_servers (id) ON DELETE CASCADE,
  tool_id text REFERENCES mcp_server_tools (id) ON DELETE CASCADE,
  effect text NOT NULL DEFAULT 'allow',
  allow_write boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mcp_tool_policies_server_idx
  ON mcp_tool_policies (server_id);

CREATE UNIQUE INDEX IF NOT EXISTS mcp_tool_policies_server_tool_scope_uq
  ON mcp_tool_policies (server_id, COALESCE(tool_id, ''), scope, COALESCE(scope_id, ''));
