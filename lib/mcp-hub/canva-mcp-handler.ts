/**
 * Thin Canva MCP JSON-RPC handler (tools/list + tools/call).
 * Spec: specs/domain/mcp-hub-canva.md
 */

import {
  createDesignAutofill,
  createDesignExport,
  getAutofillJob,
  getDesign,
  getDesignExport,
  listBrandTemplates,
} from '@/lib/mcp-hub/canva-client';
import { getMcpServerBySlug } from '@/lib/mcp-hub/store';
import { mcpHubOauthStartPath, resolveUserAccessToken } from '@/lib/mcp-hub/oauth';
import { runtimeEnv } from '@/lib/runtime-env';

export type CanvaMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const CANVA_MCP_TOOLS: CanvaMcpTool[] = [
  {
    name: 'brand_templates_list',
    description: 'List Canva brand templates (social templates). Optional query string.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        continuation: { type: 'string' },
        dataset: { type: 'string', description: 'any | non_empty' },
      },
    },
  },
  {
    name: 'design_open_url',
    description:
      'Return Canva edit/view URL for a design id, or create_url from a brand template id.',
    inputSchema: {
      type: 'object',
      properties: {
        designId: { type: 'string' },
        brandTemplateId: { type: 'string' },
        createUrl: { type: 'string', description: 'Passthrough create_url if already known' },
      },
    },
  },
  {
    name: 'design_export',
    description: 'Export a Canva design (png/jpg/pdf/mp4). Returns job id and download URLs when ready.',
    inputSchema: {
      type: 'object',
      properties: {
        designId: { type: 'string' },
        format: { type: 'string', enum: ['png', 'jpg', 'pdf', 'mp4'] },
        poll: { type: 'boolean', description: 'Poll once for completion (default true)' },
      },
      required: ['designId'],
    },
  },
  {
    name: 'design_autofill',
    description:
      'Autofill a brand template (Enterprise). On plan denial returns enterprise_required + open template URL.',
    inputSchema: {
      type: 'object',
      properties: {
        brandTemplateId: { type: 'string' },
        title: { type: 'string' },
        data: { type: 'object' },
        createUrl: { type: 'string' },
      },
      required: ['brandTemplateId'],
    },
  },
];

function jsonResult(payload: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

/**
 * In-process tools/call for the thin Canva MCP (avoids Coolify hairpin to public baseUrl).
 * Headers must include X-Plexon-User-Id (and service secret is assumed for Hub trust).
 */
export async function callCanvaMcpToolInProcess(
  mcpName: string,
  args: Record<string, unknown>,
  headers: Record<string, string>
): Promise<string> {
  const req = new Request('http://127.0.0.1/api/platform/mcp-hub/canva', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  try {
    const res = await handleCanvaMcpRpc(req, {
      method: 'tools/call',
      id: 1,
      params: { name: mcpName, arguments: args },
    });
    const json = (await res.json()) as {
      result?: { content?: Array<{ type?: string; text?: string }> };
      error?: { message?: string };
    };
    if (json.error?.message) {
      return JSON.stringify({ error: json.error.message });
    }
    const content = json.result?.content ?? [];
    const parts: string[] = [];
    for (const c of content) {
      if (c && typeof c === 'object' && c.type === 'text' && typeof c.text === 'string') {
        parts.push(c.text);
      }
    }
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(json.result ?? json);
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export function verifyCanvaMcpServiceAuth(request: Request): boolean {
  const expected = runtimeEnv('PLEXON_SERVICE_SECRET');
  if (!expected) return false;
  const got =
    request.headers.get('x-plexon-service-secret') ||
    request.headers.get('X-Plexon-Service-Secret') ||
    '';
  return got === expected;
}

export function actorUserIdFromRequest(request: Request): string {
  return (
    request.headers.get('x-plexon-user-id') ||
    request.headers.get('X-Plexon-User-Id') ||
    ''
  ).trim();
}

async function accessForUser(userId: string) {
  const server = await getMcpServerBySlug('canva');
  if (!server) {
    return { error: 'canva_server_missing' as const };
  }
  return resolveUserAccessToken(server, userId);
}

export async function handleCanvaMcpRpc(
  request: Request,
  body: { method?: string; params?: Record<string, unknown>; id?: unknown }
): Promise<Response> {
  const method = String(body.method ?? '');
  const id = body.id ?? null;

  if (method === 'initialize') {
    return Response.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'plexon-canva-mcp', version: '0.1.0' },
      },
    });
  }

  if (method === 'notifications/initialized' || method === 'ping') {
    return Response.json({ jsonrpc: '2.0', id, result: {} });
  }

  if (method === 'tools/list') {
    return Response.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: CANVA_MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
  }

  if (method === 'tools/call') {
    const name = String(body.params?.name ?? '');
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const userId = actorUserIdFromRequest(request);
    if (!userId) {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: jsonResult({ error: 'missing_actor', message: 'X-Plexon-User-Id required' }),
      });
    }
    const tokenResult = await accessForUser(userId);
    if ('error' in tokenResult) {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: jsonResult({
          error: tokenResult.error,
          connectUrl:
            'connectUrl' in tokenResult
              ? tokenResult.connectUrl
              : mcpHubOauthStartPath('canva'),
        }),
      });
    }
    const accessToken = tokenResult.accessToken;
    try {
      if (name === 'brand_templates_list') {
        const res = await listBrandTemplates(accessToken, {
          query: typeof args.query === 'string' ? args.query : undefined,
          continuation: typeof args.continuation === 'string' ? args.continuation : undefined,
          dataset: typeof args.dataset === 'string' ? args.dataset : undefined,
        });
        if (!res.ok) {
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({ error: res.error, status: res.status, body: res.body }),
          });
        }
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: jsonResult({
            items: (res.data.items ?? []).map((it) => ({
              id: it.id,
              title: it.title,
              viewUrl: it.view_url,
              createUrl: it.create_url,
              thumbnailUrl: it.thumbnail?.url,
            })),
            continuation: res.data.continuation ?? null,
          }),
        });
      }

      if (name === 'design_open_url') {
        if (typeof args.createUrl === 'string' && args.createUrl) {
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({ url: args.createUrl, kind: 'create' }),
          });
        }
        if (typeof args.designId === 'string' && args.designId) {
          const res = await getDesign(accessToken, args.designId);
          if (!res.ok) {
            return Response.json({
              jsonrpc: '2.0',
              id,
              result: jsonResult({ error: res.error, status: res.status }),
            });
          }
          const url =
            res.data.design?.urls?.edit_url || res.data.design?.urls?.view_url || null;
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({
              url,
              designId: res.data.design?.id,
              title: res.data.design?.title,
              kind: 'edit',
            }),
          });
        }
        if (typeof args.brandTemplateId === 'string') {
          const listed = await listBrandTemplates(accessToken, {
            query: args.brandTemplateId,
          });
          const hit = listed.ok
            ? listed.data.items?.find((i) => i.id === args.brandTemplateId)
            : null;
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({
              url: hit?.create_url ?? hit?.view_url ?? null,
              brandTemplateId: args.brandTemplateId,
              kind: 'template',
            }),
          });
        }
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: jsonResult({ error: 'designId_or_brandTemplateId_required' }),
        });
      }

      if (name === 'design_export') {
        const designId = String(args.designId ?? '');
        if (!designId) {
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({ error: 'designId_required' }),
          });
        }
        const format = (['png', 'jpg', 'pdf', 'mp4'] as const).includes(
          args.format as 'png' | 'jpg' | 'pdf' | 'mp4'
        )
          ? (args.format as 'png' | 'jpg' | 'pdf' | 'mp4')
          : 'png';
        const created = await createDesignExport(accessToken, { designId, format });
        if (!created.ok) {
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({ error: created.error, status: created.status, body: created.body }),
          });
        }
        const jobId = created.data.job?.id;
        const shouldPoll = args.poll !== false;
        if (jobId && shouldPoll) {
          for (let i = 0; i < 6; i++) {
            await new Promise((r) => setTimeout(r, 800));
            const polled = await getDesignExport(accessToken, jobId);
            if (polled.ok && polled.data.job?.status === 'success') {
              return Response.json({
                jsonrpc: '2.0',
                id,
                result: jsonResult({
                  jobId,
                  status: 'success',
                  urls: polled.data.job.urls ?? [],
                  format,
                }),
              });
            }
            if (polled.ok && polled.data.job?.status === 'failed') {
              return Response.json({
                jsonrpc: '2.0',
                id,
                result: jsonResult({ jobId, status: 'failed', error: polled.data.job.error }),
              });
            }
          }
        }
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: jsonResult({
            jobId,
            status: created.data.job?.status ?? 'in_progress',
            urls: created.data.job?.urls ?? [],
            format,
          }),
        });
      }

      if (name === 'design_autofill') {
        const brandTemplateId = String(args.brandTemplateId ?? '');
        if (!brandTemplateId) {
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({ error: 'brandTemplateId_required' }),
          });
        }
        const created = await createDesignAutofill(accessToken, {
          brandTemplateId,
          title: typeof args.title === 'string' ? args.title : undefined,
          data:
            args.data && typeof args.data === 'object'
              ? (args.data as Record<string, unknown>)
              : {},
        });
        if (!created.ok) {
          const enterprise =
            created.status === 403 ||
            /enterprise|forbidden|not.?allowed|plan/i.test(created.error);
          return Response.json({
            jsonrpc: '2.0',
            id,
            result: jsonResult({
              error: enterprise ? 'enterprise_required' : created.error,
              status: created.status,
              fallback: {
                openTemplateUrl:
                  typeof args.createUrl === 'string' ? args.createUrl : null,
                message: enterprise
                  ? 'Autofill needs a Canva plan with Brand Templates / Enterprise. Open the template URL instead.'
                  : undefined,
              },
            }),
          });
        }
        const jobId = created.data.job?.id;
        if (jobId) {
          for (let i = 0; i < 6; i++) {
            await new Promise((r) => setTimeout(r, 800));
            const polled = await getAutofillJob(accessToken, jobId);
            if (polled.ok && (polled.data.job?.status === 'success' || polled.data.job?.result)) {
              return Response.json({
                jsonrpc: '2.0',
                id,
                result: jsonResult({
                  jobId,
                  status: polled.data.job?.status ?? 'success',
                  result: polled.data.job?.result ?? null,
                }),
              });
            }
            if (polled.ok && polled.data.job?.status === 'failed') {
              return Response.json({
                jsonrpc: '2.0',
                id,
                result: jsonResult({
                  jobId,
                  status: 'failed',
                  error: polled.data.job.error,
                  fallback: {
                    openTemplateUrl:
                      typeof args.createUrl === 'string' ? args.createUrl : null,
                  },
                }),
              });
            }
          }
        }
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: jsonResult({
            jobId,
            status: created.data.job?.status ?? 'in_progress',
          }),
        });
      }

      return Response.json({
        jsonrpc: '2.0',
        id,
        result: jsonResult({ error: `unknown_tool:${name}` }),
      });
    } catch (e) {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: jsonResult({
          error: e instanceof Error ? e.message : String(e),
        }),
      });
    }
  }

  return Response.json(
    {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
    { status: 400 }
  );
}
