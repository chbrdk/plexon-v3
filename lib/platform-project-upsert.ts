import type { PlatformProductId } from '@/lib/platform-entitlements';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
import {
  getAudionServiceApiUrl,
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
};

function projectUpsertUrl(productId: PlatformProductId, platformProjectId: string): string | null {
  const encoded = encodeURIComponent(platformProjectId);
  if (productId === 'checkion') {
    const base = getCheckionServiceApiUrl();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/api/platform/provisioning/projects/${encoded}`;
  }
  if (productId === 'audion') {
    const base = getAudionServiceApiUrl();
    if (!base) return null;
    return `${base.replace(/\/+$/, '')}/platform/provisioning/projects/${encoded}`;
  }
  return null;
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
      headers: {
        'Content-Type': 'application/json',
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
        [PLEXON_SERVICE_SECRET_HEADER]: serviceSecret,
      },
      body: JSON.stringify(payload),
    });
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
        error: data?.details || response.statusText,
      };
    }
    const externalProjectId =
      data?.externalProjectId?.trim() || data?.projectId?.trim() || null;
    return {
      supported: true,
      ok: true,
      status: response.status,
      data: data
        ? { ...data, externalProjectId: externalProjectId ?? data.externalProjectId }
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
