import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
import {
  getAudionPlatformApiBase,
  getBrandionServiceApiUrl,
  getCheckionServiceApiUrl,
} from '@/lib/constants';

export type PlatformProjectUpsertPayload = {
  platformCompanyId: string;
  name: string;
  domain?: string | null;
  status: 'active' | 'archived';
  ownerUserId: string;
  contractVersion: string;
  source: string;
  requestedAt: string;
};

export type PlatformProjectUpsertResponse = {
  status: string;
  externalProjectId?: string | null;
  /** AUDION v3 historically returned `projectId` — accept as alias. */
  projectId?: string | null;
  details?: string | null;
  error?: string | null;
};

function projectUpsertUrl(productId: PlatformProductId, platformProjectId: string): string | null {
  const encoded = encodeURIComponent(platformProjectId);
  if (productId === 'checkion') {
    const base = getCheckionServiceApiUrl();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/api/platform/provisioning/projects/${encoded}`;
  }
  if (productId === 'audion') {
    const base = getAudionPlatformApiBase();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/platform/provisioning/projects/${encoded}`;
  }
  if (productId === 'brandion') {
    const base = getBrandionServiceApiUrl();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/api/platform/provisioning/projects/${encoded}`;
  }
  return null;
}

function summarizeUpsertFailure(
  url: string,
  status: number,
  data: PlatformProjectUpsertResponse | undefined,
  text: string,
  redirected: boolean
): string {
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url.slice(0, 64);
    }
  })();
  const detail =
    data?.details?.trim() ||
    data?.error?.trim() ||
    (text && !text.trimStart().startsWith('<') && !text.trimStart().startsWith('{')
      ? text.trim().slice(0, 120)
      : '');
  const parts = [`HTTP ${status}`, host];
  if (redirected) parts.push('redirected (check AUDION URL — missing /api?)');
  if (detail) parts.push(detail);
  else if (text.trimStart().startsWith('<')) parts.push('HTML response (wrong host/path)');
  else if (!data) parts.push('non-JSON body');
  else if (!data.externalProjectId && !data.projectId) parts.push('missing externalProjectId');
  return parts.join(' · ');
}

export async function pushPlatformProjectUpsert(
  productId: PlatformProductId,
  platformProjectId: string,
  payload: PlatformProjectUpsertPayload
): Promise<{
  supported: boolean;
  ok: boolean;
  status: number;
  data?: PlatformProjectUpsertResponse;
  error?: string;
}> {
  const url = projectUpsertUrl(productId, platformProjectId);
  if (!url) {
    return { supported: false, ok: false, status: 501, error: `No base URL for ${productId}` };
  }
  const serviceSecret = process.env.PLEXON_SERVICE_SECRET?.trim();
  if (!serviceSecret) {
    return { supported: false, ok: false, status: 503, error: 'PLEXON_SERVICE_SECRET not configured' };
  }
  try {
    const response = await fetch(url, {
      method: 'PUT',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_SERVICE_SECRET_HEADER]: serviceSecret,
      },
      body: JSON.stringify(payload),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') || '';
      return {
        supported: true,
        ok: false,
        status: response.status,
        error: summarizeUpsertFailure(url, response.status, undefined, location, true),
      };
    }
    const text = await response.text();
    let data: PlatformProjectUpsertResponse | undefined;
    try {
      data = text ? (JSON.parse(text) as PlatformProjectUpsertResponse) : undefined;
    } catch {
      // ignore
    }
    if (!response.ok) {
      return {
        supported: true,
        ok: false,
        status: response.status,
        data,
        error: summarizeUpsertFailure(url, response.status, data, text, response.redirected),
      };
    }
    const externalProjectId =
      data?.externalProjectId?.trim() || data?.projectId?.trim() || null;
    if (!externalProjectId) {
      return {
        supported: true,
        ok: false,
        status: response.status,
        data,
        error: summarizeUpsertFailure(url, response.status, data, text, response.redirected),
      };
    }
    return {
      supported: true,
      ok: true,
      status: response.status,
      data: data
        ? { ...data, externalProjectId }
        : { status: 'ok', externalProjectId },
    };
  } catch (error) {
    return {
      supported: true,
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Project upsert failed',
    };
  }
}
