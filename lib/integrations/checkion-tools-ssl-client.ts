import { checkionApiToolsSsl } from '@/lib/paths/checkion-api';
import {
  fetchCheckionToolGet,
  normalizeCheckionHost,
} from '@/lib/integrations/checkion-tools-client';

export type SslCheckPreview = {
  host: string;
  grade: string | null;
  status: string;
  endpoints?: Array<{ grade?: string; serverName?: string }>;
};

export type SslCheckResult =
  | { ok: true; data: SslCheckPreview }
  | { ok: false; error: string; missing?: Array<'host'> };

export async function fetchCheckionSslCheck(hostOrUrl: string): Promise<SslCheckResult> {
  const host = normalizeCheckionHost(hostOrUrl);
  if (!host) {
    return { ok: false, error: 'Host fehlt', missing: ['host'] };
  }

  const result = await fetchCheckionToolGet<SslCheckPreview>(
    checkionApiToolsSsl(host),
    'SSL'
  );
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
