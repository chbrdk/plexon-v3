import type { PageSpeedPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import type { ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import {
  pollCheckionGeoEeatJob,
  startCheckionGeoEeat,
} from '@/lib/integrations/checkion-geo-client';
import { fetchCheckionPageSpeed } from '@/lib/integrations/checkion-pagespeed-client';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';
import { fetchCheckionSslCheck } from '@/lib/integrations/checkion-tools-ssl-client';
import { fetchCheckionContrastCheck } from '@/lib/integrations/checkion-tools-contrast-client';
import { fetchCheckionReadabilityForUrl } from '@/lib/integrations/checkion-tools-readability-client';
import type { ContrastCheckPreview } from '@/lib/integrations/checkion-tools-contrast-client';
import type { ReadabilityCheckPreview } from '@/lib/integrations/checkion-tools-readability-client';
import type { SslCheckPreview } from '@/lib/integrations/checkion-tools-ssl-client';
import { fetchMozillaObservatorySecurity } from '@/lib/integrations/external/mozilla-observatory-client';
import type { SecurityHeadersPreview } from '@/lib/integrations/external/mozilla-observatory-client';
import { fetchDnsCheck } from '@/lib/integrations/external/dns-doh-client';
import type { DnsCheckPreview } from '@/lib/integrations/external/dns-doh-client';
import type { PlaybookContext, PlaybookStepKind } from '@/lib/assistant/playbooks/types';

export type PlaybookStepPayload =
  | { kind: 'pagespeed_check'; data: PageSpeedPreview }
  | { kind: 'quick_scan'; data: ScanResultPreview }
  | { kind: 'ssl_check'; data: SslCheckPreview }
  | { kind: 'contrast_check'; data: ContrastCheckPreview }
  | { kind: 'readability_check'; data: ReadabilityCheckPreview }
  | { kind: 'geo_analysis'; data: GeoEeatJobPreview }
  | { kind: 'security_headers'; data: SecurityHeadersPreview }
  | { kind: 'dns_check'; data: DnsCheckPreview };

export type ExecutePlaybookStepResult =
  | { ok: true; payload: PlaybookStepPayload }
  | { ok: false; error: string }
  | { ok: true; skipped: true; reason: string };

export async function executePlaybookStep(
  kind: PlaybookStepKind,
  ctx: PlaybookContext & { url: string },
  options: { timeoutMs?: number } = {}
): Promise<ExecutePlaybookStepResult> {
  const url = ctx.url;
  const checkionProjectId = ctx.checkionProjectId;

  switch (kind) {
    case 'pagespeed_check': {
      const result = await fetchCheckionPageSpeed(url);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'pagespeed_check', data: result.data } };
    }
    case 'quick_scan': {
      const result = await runCheckionQuickScan({ url, checkionProjectId });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'quick_scan', data: result.scan } };
    }
    case 'ssl_check': {
      const result = await fetchCheckionSslCheck(url);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'ssl_check', data: result.data } };
    }
    case 'contrast_check': {
      if (!ctx.contrast) {
        return { ok: true, skipped: true, reason: 'Keine Kontrast-Farben im Prompt' };
      }
      const result = await fetchCheckionContrastCheck(ctx.contrast);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'contrast_check', data: result.data } };
    }
    case 'readability_check': {
      const result = await fetchCheckionReadabilityForUrl(url);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'readability_check', data: result.data } };
    }
    case 'geo_analysis': {
      if (ctx.includeGeo === false) {
        return { ok: true, skipped: true, reason: 'GEO für dieses Audit deaktiviert' };
      }
      const started = await startCheckionGeoEeat({ url, projectId: checkionProjectId });
      if (!started.ok) return { ok: false, error: started.error };
      const polled = await pollCheckionGeoEeatJob(started.jobId, {
        maxMs: options.timeoutMs ?? 600_000,
      });
      if (!polled.ok) return { ok: false, error: polled.error };
      return { ok: true, payload: { kind: 'geo_analysis', data: polled.job } };
    }
    case 'security_headers': {
      const result = await fetchMozillaObservatorySecurity(url);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'security_headers', data: result.data } };
    }
    case 'dns_check': {
      const result = await fetchDnsCheck(url);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, payload: { kind: 'dns_check', data: result.data } };
    }
    default:
      return { ok: true, skipped: true, reason: `Schritt ${kind} nicht im Website-Audit` };
  }
}
