# CHECKION MCP as tools for PLEXON board prompt cards

When the PLEXON board prompt card sends a request to `/api/board/complete`, the backend can use **CHECKION MCP tools** so that Claude can call CHECKION (scans, projects, journeys, etc.) while answering.

## Enabling MCP on the board

- **Port toolbar:** On any card, click the **+** on a port (top/right/bottom/left) to open the circular port menu. The menu shows options for Prompt, Dokument, Bild, Video, Link and **CHECKION** (plug icon). Click **CHECKION** to toggle MCP on or off. When on, the CHECKION option is highlighted (accent background).
- **Badge card:** When MCP is enabled in the port menu, a small **tool card** (round card with plug icon) appears; you can connect it to a prompt card. It uses the Prismion variant `kind: 'tool'` (ToolCard). The card is square in size (e.g. 56×56) so it renders as a circle.
- **Connection in chain required:** MCP/tools are used for a prompt card when the **tool card is in the upstream connection chain** of that prompt card.
- **Board behaviour:** New result and prompt cards are placed without overlapping existing cards (collision avoidance via `findNonOverlappingPosition`). Connector lines use the stored ports (`fromPort`/`toPort`) and end at the port center. That includes: (1) tool card directly connected to the prompt card, or (2) tool card → prompt A → result → prompt B (user adds prompt B from result’s port); then prompt B also gets MCP because the tool card is upstream in the chain. If the tool card is on the board but not in the chain leading to the prompt you submit from, tools are not available.
- **Persistence:** The MCP-on state and badge position are stored in `localStorage` (board state) and restored on reload.

## Configuration

- **Env:** `MCP_SERVER_URL` or `CHECKION_MCP_URL` – base URL of the MCP server (Streamable HTTP), e.g. `https://checkion.projects-a.plygrnd.tech/mcp` or `https://checkion-mcp.your-domain.com`. Priority: `CHECKION_MCP_URL` then `MCP_SERVER_URL`.
- If neither is set, the route behaves as before (no tools, plain Claude completion).
- **Model when MCP is used:** When the client sends `useCheckionMcp: true` and the server has a MCP URL and loads tools, the route uses `getBoardCompletionModelWithMcp()` (default **claude-sonnet-4-6**). Override with `ANTHROPIC_BOARD_MODEL` if needed.

## Flow

1. Board page sends `{ prompt, messages, useCheckionMcp? }` to `POST /api/board/complete`. `useCheckionMcp` is `true` when the CHECKION tool card is in the **upstream connection chain** of the prompt card being submitted (same order as chat history: tool → prompt A → result → prompt B still has tool in chain for B).
2. If `useCheckionMcp` is true and `CHECKION_MCP_URL` is set, the route fetches the tool list from the MCP server (`tools/list`), converts it to Anthropic tool format, and uses **Sonnet 4.6** for the request.
3. If Claude returns `stop_reason: tool_use`, the route calls the MCP server for each tool (`tools/call`), then appends assistant message + tool results and calls Claude again. Up to `MAX_TOOL_ROUNDS` (5) rounds.
4. The final text response is returned to the frontend and shown in the result card.

## Code references

- **Constants:** `lib/constants.ts` – `getCheckionMcpUrl()`.
- **MCP client:** `lib/checkion-mcp-client.ts` – `fetchCheckionMcpTools`, `callCheckionMcpTool`, `mcpToolsToAnthropic`.
- **Route:** `app/api/board/complete/route.ts` – tools fetch, message building, tool_use loop.

## CHECKION MCP server

Deploy and configure the CHECKION MCP server as described in CHECKION-1 (e.g. `CHECKION-1/README.md`, `CHECKION-1/mcp-server/README.md`). The MCP server needs `CHECKION_API_URL` and `CHECKION_API_TOKEN` to talk to the CHECKION app.

## Troubleshooting

- **"Server already initialized" (HTTP 400):** The MCP client caches the session per `baseUrl` and only sends `initialize` once per server; if the server returns this error (e.g. when the same MCP backend is reused across requests), the client treats it as “already have session” and continues with `tools/list` or `tools/call` without sending `initialize` again. See `lib/checkion-mcp-client.ts` – `getSessionIdOrNull` and `mcpInitializeAndGetSession`.

- **"Mcp-Session-Id header is required" (HTTP 400):** When the MCP server is behind a proxy (e.g. CHECKION rewrites `/mcp` → MCP), the proxy often does not forward the `Mcp-Session-Id` response header to the client. The client then gets no session after `initialize` and later requests fail. **Fix:** Set **`MCP_STATELESS=true`** in the CHECKION MCP server's environment (Coolify: MCP service env). Then the server does not require a session. See `CHECKION-1/mcp-server/README.md` (Option B).

- **"event: mes"... is not valid JSON:** The MCP server responded with SSE (`text/event-stream`) instead of plain JSON. The PLEXON client now parses SSE (extracts JSON from `data:` lines) via `parseMcpResponseBody` in `lib/checkion-mcp-client.ts`.

- **MCP HTTP 500 (empty or with message):** Server-side error in the MCP server.

- **MCP server logs "Stateless sending 200 bodyLen=…" but PLEXON gets 500 with empty body:** The MCP container is sending 200 with a valid JSON body; something between the MCP service and PLEXON (usually the **Coolify/Traefik ingress**) is returning 500 and dropping the body. **Fix:** Bypass the public proxy by calling the MCP service over the **internal network**. In PLEXON’s environment (Coolify), set the MCP URL to the **internal** URL of the MCP service, e.g. `MCP_SERVER_URL=http://<mcp-service-name>:3100` (replace `<mcp-service-name>` with the actual Coolify service/container name for the MCP app; **use `http://` not `https://`** for internal URLs – the MCP server does not serve TLS). Requests then go directly from the PLEXON container to the MCP container without passing through the public ingress, so the response is no longer altered.

**If you see "fetch failed" with an internal URL:** The PLEXON client now logs the underlying cause (e.g. `cause: getaddrinfo ENOTFOUND checkion-mcp` or `cause: connect ECONNREFUSED`).  
- **ENOTFOUND / EAI_AGAIN:** The hostname does not resolve from the PLEXON container (different Docker/Coolify network). Put PLEXON and the MCP service in the **same Coolify project** so they share an internal network, and use the **internal hostname** Coolify shows for the MCP service (often the application name, or the service name in the project). If that still doesn’t resolve, use the **public MCP URL** again and fix the proxy/ingress (e.g. increase buffer or timeouts) instead of the internal URL.  
- **ECONNREFUSED:** Nothing is listening on that host:port from PLEXON’s network (wrong port, or MCP not attached to the same network). Check that the MCP service is running and that port 3100 is the one it listens on.

- **200 with empty body (tools/list):** If the MCP server logs `writeHead status=200` and `end chunkLen=0`, the SDK is sending 200 but the response body is empty (e.g. with `enableJsonResponse: true` the response may not be stored correctly by request id). The PLEXON client now treats empty body as "no tools" and returns `[]` so the board still works; CHECKION tools will be unavailable until the MCP server returns a non-empty body (e.g. SDK fix or different transport options). Check the **MCP server logs** in Coolify (container logs for the CHECKION MCP service). The MCP server now logs `[CHECKION MCP] Request error: ...` and returns the error message in the response body when an uncaught exception occurs; the PLEXON client shows that message. Common causes: missing `CHECKION_API_URL`/`CHECKION_API_TOKEN`, network/DNS issues to CHECKION, or SDK/transport bugs.
