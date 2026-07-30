# AUDION MCP as tools for PLEXON board prompt cards

When the PLEXON board prompt card sends a request to `/api/board/complete`, the backend can use **AUDION MCP tools** (in addition to CHECKION MCP) so that Claude can call AUDION (projects, personas, target groups, journeys, AI assist, etc.) while answering.

## Enabling AUDION MCP on the board

- **Port toolbar:** On any card, click the **+** on a port to open the circular port menu. The menu shows **CHECKION** and **AUDION** (plug icon). Click **AUDION** to toggle AUDION MCP on or off. When on, the AUDION option is highlighted.
- **Badge card:** When AUDION MCP is enabled, a small **AUDION tool card** (round card with plug icon, label "AUDION") appears; you can connect it to a prompt card. It uses the same Prismion variant `kind: 'tool'` (ToolCard).
- **Connection in chain required:** AUDION tools are used for a prompt card when the **AUDION tool card is in the upstream connection chain** of that prompt card. CHECKION and AUDION can both be in the chain; the API merges tools from both MCP servers.
- **Persistence:** The AUDION MCP-on state and badge position are stored in `localStorage` (board state) and restored on reload.

## Configuration

- **Env (PLEXON / Board-API):** `AUDION_MCP_URL` – base URL of the AUDION MCP server (Streamable HTTP), e.g. `https://audion.example.com/mcp` or internal `http://audion-mcp:3100`. If not set, AUDION tools are not loaded.
- **Model when MCP is used:** When the client sends `useAudionMcp: true` (or `useCheckionMcp: true`) and the server has the corresponding MCP URL and loads tools, the route uses `getBoardCompletionModelWithMcp()` (default **claude-sonnet-4-6**). Override with `ANTHROPIC_BOARD_MODEL` if needed.

## Flow

1. Board page sends `{ prompt, messages, useCheckionMcp?, useAudionMcp? }` to `POST /api/board/complete`. `useAudionMcp` is `true` when the AUDION tool card is in the **upstream connection chain** of the prompt card being submitted.
2. If `useAudionMcp` is true and `AUDION_MCP_URL` is set, the route fetches the tool list from the AUDION MCP server (`tools/list`), converts to Anthropic tool format, and merges with CHECKION tools (if any).
3. If Claude returns `stop_reason: tool_use`, the route calls the correct MCP server for each tool (by tool name prefix: checkion_* → CHECKION URL, audion_* → AUDION URL), then appends assistant message + tool results and calls Claude again. Up to `MAX_TOOL_ROUNDS` (5) rounds.
4. The final text response is returned to the frontend and shown in the result card.

## Code references

- **Constants:** `lib/constants.ts` – `AUDION_MCP_BADGE_ID`, `getAudionMcpUrl()`.
- **MCP client:** Same as CHECKION – `lib/checkion-mcp-client.ts` (`fetchCheckionMcpTools`, `callCheckionMcpTool`) is used with the AUDION base URL for AUDION tools.
- **Route:** `app/api/board/complete/route.ts` – merges tools from both servers, `toolSourceByAnthropicName` for routing tool calls.

## AUDION MCP server

Deploy and configure the AUDION MCP server as described in AUDION-v2 (e.g. `AUDION-v2/mcp-server/README.md`, `AUDION-v2/knowledge/audion-mcp-server.md`). The MCP server needs `AUDION_API_URL` and `AUDION_API_TOKEN` to talk to the AUDION FastAPI app.

## Troubleshooting: "API antwortet mit 404" / HTTP 404

If tools load (54 AUDION tools) but tool execution returns 404:

- **404 from the MCP endpoint (POST tools/call):** The reverse proxy in front of the AUDION MCP service may not be forwarding POST requests. Use an **internal** `AUDION_MCP_URL` in PLEXON (e.g. `http://audion-mcp:3100` in the same Coolify project) so requests never go through the public proxy, or configure the proxy to forward POST to the MCP container.
- **404 from the AUDION API (when a tool runs):** The MCP container calls `AUDION_API_URL` (e.g. `/health`, `/projects`). Set `AUDION_API_URL` in the **AUDION MCP** Coolify service to the exact FastAPI base URL (e.g. `http://audion-api:8000`), without `/api` unless your deployment uses that prefix. See `knowledge/coolify-env-variablen.md` (section "404 bei AUDION-Tools") for details.
