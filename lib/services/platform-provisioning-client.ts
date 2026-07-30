import {
  getAudionServiceApiUrl,
  getCheckionServiceApiUrl,
} from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';
import type { PlatformProductId } from '@/lib/platform-entitlements';
import type {
  PlatformProvisioningRequestPayload,
  PlatformProvisioningResponse,
} from '@/lib/platform-provisioning';

type ProvisioningClientResult = {
  supported: boolean;
  ok: boolean;
  status: number;
  data?: PlatformProvisioningResponse;
  error?: string;
};

function getProvisioningBaseUrl(productId: PlatformProductId): string | null {
  switch (productId) {
    case 'checkion':
      return getCheckionServiceApiUrl();
    case 'audion':
      return getAudionServiceApiUrl();
    default:
      return null;
  }
}

function buildProvisioningUrl(productId: PlatformProductId, userId: string): string | null {
  const base = getProvisioningBaseUrl(productId);
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/api/platform/provisioning/users/${encodeURIComponent(userId)}`;
}

export function isPlatformProvisioningSupported(productId: PlatformProductId): boolean {
  return Boolean(buildProvisioningUrl(productId, 'probe') && process.env.PLEXON_SERVICE_SECRET?.trim());
}

export async function pushPlatformProvisioning(
  productId: PlatformProductId,
  payload: PlatformProvisioningRequestPayload
): Promise<ProvisioningClientResult> {
  const url = buildProvisioningUrl(productId, payload.userId);
  if (!url) {
    return {
      supported: false,
      ok: false,
      status: 501,
      error: `Provisioning not supported for ${productId}`,
    };
  }

  const serviceSecret = process.env.PLEXON_SERVICE_SECRET?.trim();
  if (!serviceSecret) {
    return {
      supported: false,
      ok: false,
      status: 503,
      error: 'PLEXON_SERVICE_SECRET not configured',
    };
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
    let data: PlatformProvisioningResponse | undefined;
    try {
      data = text ? (JSON.parse(text) as PlatformProvisioningResponse) : undefined;
    } catch {
      // non-json response
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
    return {
      supported: true,
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      supported: true,
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Provisioning request failed',
    };
  }
}
