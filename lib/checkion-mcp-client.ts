/**
 * CHECKION MCP client for PLEXON board prompt cards.
 * When MCP_SERVER_URL or CHECKION_MCP_URL is set, the board complete API uses this to list tools
 * and execute tool calls so Claude can use CHECKION (scans, projects, etc.).
 * Uses plain fetch + JSON-RPC (no @modelcontextprotocol/sdk) so the Docker build
 * does not depend on SDK subpath resolution.
 */

export type AnthropicTool = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

/** Anthropic allows only ^[a-zA-Z0-9_-]{1,128}$ for tool names; MCP uses e.g. checkion.scan_single. */
const ANTHROPIC_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
export function toAnthropicToolName(mcpName: string): string {
  if (ANTHROPIC_NAME_PATTERN.test(mcpName)) return mcpName;
  return mcpName.replace(/\./g, '_');
}

/**
 * Convert MCP listTools result to Anthropic tools format.
 * Tool names are sanitized for Anthropic (dots -> underscores); use mcpNameByAnthropicName to map back when calling tools.
 */
export function mcpToolsToAnthropic(tools: McpTool[]): {
  tools: AnthropicTool[];
  mcpNameByAnthropicName: Record<string, string>;
} {
  const mcpNameByAnthropicName: Record<string, string> = {};
  const anthropicTools: AnthropicTool[] = tools.map((t): AnthropicTool => {
    const mcpName = String(t.name);
    const name = toAnthropicToolName(mcpName);
    mcpNameByAnthropicName[name] = mcpName;
    const props = t.inputSchema?.properties;
    const properties: Record<string, { type?: string; description?: string }> = {};
    if (props && typeof props === 'object') {
      for (const [k, v] of Object.entries(props)) {
        const val = v as Record<string, unknown> | null | undefined;
        if (val && typeof val === 'object') {
          properties[k] = {
            type: typeof val.type === 'string' ? val.type : 'string',
            description: typeof val.description === 'string' ? val.description : undefined,
          };
        }
      }
    }
    return {
      name,
      description: typeof t.description === 'string' ? t.description : mcpName,
      input_schema: {
        type: 'object',
        properties: Object.keys(properties).length > 0 ? properties : undefined,
        required: Array.isArray(t.inputSchema?.required) ? t.inputSchema.required : [],
      },
    };
  });
  return { tools: anthropicTools, mcpNameByAnthropicName };
}

const MCP_SESSION_HEADER = 'mcp-session-id';

/** In-memory cache: baseUrl -> session ID or null (so we don't send initialize twice and hit "Server already initialized"). */
const sessionCache = new Map<string, string | null>();

/** Short TTL cache for tools/list — avoids re-listing on every assistant turn. */
const TOOLS_LIST_TTL_MS = 60_000;
const toolsListCache = new Map<
  string,
  { expiresAt: number; value: { tools: AnthropicTool[]; mcpNameByAnthropicName: Record<string, string> } }
>();

/**
 * Parse MCP response body: server may return application/json or text/event-stream (SSE).
 * SSE format: "event: message\ndata: {...}\n" or multiple data lines. We take the last JSON from a "data:" line.
 */
function parseMcpResponseBody<T>(text: string, contentType: string | null): T {
  const isSSE =
    (contentType?.toLowerCase().includes('text/event-stream') ?? false) || text.trimStart().startsWith('event:');
  if (!isSSE) {
    return JSON.parse(text) as T;
  }
  let last: T | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (payload === '[DONE]' || !payload) continue;
      try {
        last = JSON.parse(payload) as T;
      } catch {
        // skip unparseable lines
      }
    }
  }
  if (last === undefined) throw new Error('MCP SSE response had no valid data line');
  return last;
}

/** Send JSON-RPC to MCP server. Use sessionId after initialize for non-stateless servers. */
async function mcpRequest<T>(
  baseUrl: string,
  method: string,
  params: Record<string, unknown>,
  sessionId?: string | null
): Promise<{ result: T; sessionId?: string | null }> {
  const url = baseUrl.replace(/\/$/, '');
  const id = Math.floor(Math.random() * 1e9);
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  });
  const headers: Record<string, string> = {
    ...buildMcpHeaders(url),
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) {
    headers[MCP_SESSION_HEADER] = sessionId;
  }
  console.log('[checkion-mcp] request', method, url);
  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) {
    const bodyText = await res.text();
    console.error('[checkion-mcp]', method, 'failed', res.status, 'bodyLen=', bodyText.length, bodyText.slice(0, 120));
    let detail = bodyText.trim() || '(empty body)';
    if (res.status >= 500 && bodyText.trim()) {
      try {
        const errJson = JSON.parse(bodyText) as { error?: { message?: string } };
        if (errJson.error?.message) detail = errJson.error.message;
      } catch {
        // use raw body
      }
    }
    throw new Error(`MCP HTTP ${res.status}: ${detail}`);
  }
  const nextSessionId = res.headers.get(MCP_SESSION_HEADER) ?? res.headers.get('Mcp-Session-Id') ?? undefined;
  const bodyText = await res.text();
  if (!bodyText.trim()) {
    throw new Error('MCP response empty body');
  }
  let data: { result?: T; error?: { message?: string } };
  try {
    data = parseMcpResponseBody<{ result?: T; error?: { message?: string } }>(
      bodyText,
      res.headers.get('Content-Type')
    );
  } catch (parseErr) {
    throw new Error('MCP response empty or invalid: ' + (parseErr instanceof Error ? parseErr.message : String(parseErr)));
  }
  if (data.error) {
    throw new Error(data.error.message ?? JSON.stringify(data.error));
  }
  if (data.result === undefined) {
    throw new Error('MCP response missing result');
  }
  return { result: data.result as T, sessionId: nextSessionId };
}

const INITIALIZE_PARAMS = {
  protocolVersion: '2024-11-05' as const,
  capabilities: {},
  clientInfo: { name: 'plexon-board', version: '1.0.0' },
};

/**
 * Run MCP initialize and return session ID. Uses direct fetch so we can read headers
 * on 400 "already initialized" (server may still send Mcp-Session-Id there).
 */
function buildMcpHeaders(url: string): Record<string, string> {
  let host = '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    host = u.host; // includes port if non-default
  } catch {
    host = '';
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': 'PLEXON-MCP-Client/1.0',
    'Mcp-Protocol-Version': '2024-11-05',
  };
  if (host) headers.Host = host;
  return headers;
}

async function mcpInitializeAndGetSession(baseUrl: string): Promise<string | null> {
  const url = baseUrl.replace(/\/$/, '');
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1e9),
    method: 'initialize',
    params: INITIALIZE_PARAMS,
  });
  console.log('[checkion-mcp] request initialize', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: buildMcpHeaders(url),
    body,
  });
  const sessionId =
    res.headers.get(MCP_SESSION_HEADER) ?? res.headers.get('Mcp-Session-Id') ?? null;
  const text = await res.text();
  if (!res.ok) {
    console.error('[checkion-mcp] initialize failed', res.status, 'bodyLen=', text.length, text.slice(0, 120));
  }
  if (res.ok) {
    const data = parseMcpResponseBody<{ result?: unknown; error?: { message?: string } }>(
      text,
      res.headers.get('Content-Type')
    );
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
    return sessionId ?? null;
  }
  if (res.status === 400) {
    let errMsg = text;
    try {
      const data = parseMcpResponseBody<{ error?: { message?: string } }>(text, res.headers.get('Content-Type'));
      errMsg = data.error?.message ?? text;
    } catch {
      // use raw text
    }
    if (/already initialized|Server already initialized/i.test(errMsg) && sessionId) {
      return sessionId;
    }
  }
  let detail = text.trim() || '(empty body)';
  if (res.status >= 500 && text.trim()) {
    try {
      const data = parseMcpResponseBody<{ error?: { message?: string } }>(text, res.headers.get('Content-Type'));
      if (data.error?.message) detail = data.error.message;
    } catch {
      // use trimmed text
    }
  }
  throw new Error(`MCP HTTP ${res.status}: ${detail}`);
}

/**
 * Get session ID for MCP (cached per baseUrl). Calls initialize only once per server;
 * if server returns 400 "already initialized", we use the session ID from that response when present.
 */
async function getSessionIdOrNull(baseUrl: string): Promise<string | null> {
  const key = baseUrl.replace(/\/$/, '');
  const cached = sessionCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const sessionId = await mcpInitializeAndGetSession(baseUrl);
  sessionCache.set(key, sessionId);
  return sessionId;
}

/**
 * Fetch CHECKION MCP tools (tools/list) and return Anthropic-format tools plus name map.
 * Tool names are sanitized for Anthropic (dots -> underscores); use mcpNameByAnthropicName when calling tools/call.
 */
export async function fetchCheckionMcpTools(baseUrl: string): Promise<{
  tools: AnthropicTool[];
  mcpNameByAnthropicName: Record<string, string>;
}> {
  const cached = toolsListCache.get(baseUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  try {
    const sessionId = await getSessionIdOrNull(baseUrl);
    const { result } = await mcpRequest<{ tools?: McpTool[] }>(baseUrl, 'tools/list', {}, sessionId);
    const rawTools = result?.tools ?? [];
    const value = mcpToolsToAnthropic(rawTools);
    toolsListCache.set(baseUrl, { expiresAt: Date.now() + TOOLS_LIST_TTL_MS, value });
    return value;
  } catch (err) {
    const msg = formatMcpError(err);
    console.error('[checkion-mcp] listTools failed', baseUrl, msg);
    return { tools: [], mcpNameByAnthropicName: {} };
  }
}

/** Include err.cause (e.g. ENOTFOUND, ECONNREFUSED) so we can debug "fetch failed". */
function formatMcpError(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause instanceof Error ? err.cause.message : err.cause != null ? String(err.cause) : '';
    return cause ? `${err.message}; cause: ${cause}` : err.message;
  }
  return String(err);
}

/**
 * Call a single CHECKION MCP tool (tools/call) and return its text content for tool_result.
 * Sends initialize first (or skips if server says "already initialized"), then tools/call.
 */
export async function callCheckionMcpTool(
  baseUrl: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    const sessionId = await getSessionIdOrNull(baseUrl);
    const { result } = await mcpRequest<{ content?: Array<{ type?: string; text?: string }> }>(
      baseUrl,
      'tools/call',
      { name, arguments: args },
      sessionId
    );
    const content = result?.content ?? [];
    const parts: string[] = [];
    for (const c of content) {
      if (c && typeof c === 'object' && c.type === 'text' && typeof c.text === 'string') {
        parts.push(c.text);
      }
    }
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(result);
  } catch (err) {
    console.error('[checkion-mcp] callTool failed', name, formatMcpError(err));
    return JSON.stringify({ error: formatMcpError(err) });
  }
}
