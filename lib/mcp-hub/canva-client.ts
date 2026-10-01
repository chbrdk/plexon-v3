/**
 * Canva Connect REST helpers (user access token).
 * Spec: specs/domain/mcp-hub-canva.md
 */

const CANVA_API = 'https://api.canva.com/rest/v1';

async function canvaFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; body?: unknown }> {
  const res = await fetch(`${CANVA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const errObj = body as { message?: string; code?: string } | null;
    return {
      ok: false,
      status: res.status,
      error: errObj?.message || errObj?.code || `Canva HTTP ${res.status}`,
      body,
    };
  }
  return { ok: true, data: body as T };
}

export async function listBrandTemplates(
  accessToken: string,
  opts?: { query?: string; continuation?: string; dataset?: string }
) {
  const q = new URLSearchParams();
  if (opts?.query) q.set('query', opts.query);
  if (opts?.continuation) q.set('continuation', opts.continuation);
  if (opts?.dataset) q.set('dataset', opts.dataset);
  const qs = q.toString();
  return canvaFetch<{
    items?: Array<{
      id: string;
      title?: string;
      view_url?: string;
      create_url?: string;
      thumbnail?: { url?: string };
    }>;
    continuation?: string;
  }>(accessToken, `/brand-templates${qs ? `?${qs}` : ''}`);
}

export async function getDesign(accessToken: string, designId: string) {
  return canvaFetch<{
    design?: {
      id: string;
      title?: string;
      urls?: { edit_url?: string; view_url?: string };
    };
  }>(accessToken, `/designs/${encodeURIComponent(designId)}`);
}

export async function createDesignExport(
  accessToken: string,
  input: { designId: string; format?: 'png' | 'jpg' | 'pdf' | 'mp4' }
) {
  const formatType = input.format ?? 'png';
  const formatBody =
    formatType === 'jpg'
      ? { type: 'jpg', quality: 80 }
      : formatType === 'mp4'
        ? { type: 'mp4', quality: 'horizontal_1080p' }
        : { type: formatType };
  return canvaFetch<{ job?: { id: string; status?: string; urls?: string[] } }>(
    accessToken,
    '/exports',
    {
      method: 'POST',
      body: JSON.stringify({
        design_id: input.designId,
        format: formatBody,
      }),
    }
  );
}

export async function getDesignExport(accessToken: string, exportId: string) {
  return canvaFetch<{ job?: { id: string; status?: string; urls?: string[]; error?: unknown } }>(
    accessToken,
    `/exports/${encodeURIComponent(exportId)}`
  );
}

export async function createDesignAutofill(
  accessToken: string,
  input: {
    brandTemplateId: string;
    title?: string;
    data?: Record<string, unknown>;
  }
) {
  return canvaFetch<{ job?: { id: string; status?: string; result?: unknown } }>(
    accessToken,
    '/autofills',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'create_from_brand_template',
        brand_template_id: input.brandTemplateId,
        title: input.title ?? 'Plexon autofill',
        data: input.data ?? {},
      }),
    }
  );
}

export async function getAutofillJob(accessToken: string, jobId: string) {
  return canvaFetch<{ job?: { id: string; status?: string; result?: unknown; error?: unknown } }>(
    accessToken,
    `/autofills/${encodeURIComponent(jobId)}`
  );
}
