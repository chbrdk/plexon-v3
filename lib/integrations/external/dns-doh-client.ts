import { CLOUDFLARE_DNS_QUERY_URL } from '@/lib/paths/external-apis';
import { normalizeCheckionHost } from '@/lib/integrations/checkion-tools-client';

export type DnsRecordPreview = {
  type: string;
  value: string;
};

export type DnsCheckPreview = {
  host: string;
  records: DnsRecordPreview[];
  hasMx: boolean;
  hasSpf: boolean;
};

export type DnsCheckResult =
  | { ok: true; data: DnsCheckPreview }
  | { ok: false; error: string };

type DohAnswer = { type?: number; data?: string };

async function queryDns(name: string, type: string): Promise<DohAnswer[]> {
  const url = `${CLOUDFLARE_DNS_QUERY_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  return json.Answer ?? [];
}

export async function fetchDnsCheck(hostOrUrl: string): Promise<DnsCheckResult> {
  const host = normalizeCheckionHost(hostOrUrl);
  if (!host) return { ok: false, error: 'Host fehlt' };

  try {
    const [aRecords, mxRecords, txtRecords] = await Promise.all([
      queryDns(host, 'A'),
      queryDns(host, 'MX'),
      queryDns(host, 'TXT'),
    ]);

    const records: DnsRecordPreview[] = [];
    for (const r of aRecords.slice(0, 5)) {
      if (r.data) records.push({ type: 'A', value: r.data });
    }
    for (const r of mxRecords.slice(0, 5)) {
      if (r.data) records.push({ type: 'MX', value: r.data });
    }
    const txtJoined = txtRecords.map((r) => r.data ?? '').join(' ');
    const hasSpf = /v=spf1/i.test(txtJoined);
    for (const r of txtRecords.slice(0, 5)) {
      if (r.data) records.push({ type: 'TXT', value: r.data.slice(0, 120) });
    }

    return {
      ok: true,
      data: {
        host,
        records,
        hasMx: mxRecords.length > 0,
        hasSpf,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
