import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { bindEqcReportToMagazineScene } from '@/lib/assistant/reports/pdf/magazine/bind-eqc-report-slots';
import type { CreationMagazineTemplate } from '@/lib/assistant/reports/pdf/magazine/creation-magazine-template-types';
import {
  apiCreationMagazineTemplatesLatest,
  apiCreationScenePdf,
  CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
  isEqcCreationMagazineTemplateEnabled,
} from '@/lib/paths/creation-magazine-templates';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

export type CreationEqcMagazinePdfResult =
  | { ok: true; pdf: Buffer; templateId: string; version: number; source: 'creation-template' }
  | { ok: false; reason: string };

function creationFetchHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
  };
  const secret =
    typeof process !== 'undefined' ? process.env.PLEXON_SERVICE_SECRET?.trim() : '';
  if (secret) headers[PLEXON_SERVICE_SECRET_HEADER] = secret;
  return headers;
}

export async function fetchPublishedQuickCheckMagazineTemplate(
  platformProjectId: string,
  role: string = CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
): Promise<CreationMagazineTemplate | null> {
  const url = apiCreationMagazineTemplatesLatest({ platformProjectId, role });
  if (!url) return null;
  const res = await fetch(url, { headers: creationFetchHeaders(), cache: 'no-store' });
  if (!res.ok) return null;
  const body = (await res.json()) as { template?: CreationMagazineTemplate | null };
  if (!body.template || body.template.status !== 'published') return null;
  return body.template;
}

export async function renderCreationMagazinePdfFromScene(
  scene: CreationMagazineTemplate['sceneSnapshot'],
): Promise<Buffer | null> {
  const url = apiCreationScenePdf(scene.id);
  if (!url) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...creationFetchHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scene }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5 || !buf.subarray(0, 5).toString('utf8').startsWith('%PDF')) return null;
  return buf;
}

/**
 * Prefer Creation published Mag template; caller falls back to legacy on `ok: false`.
 */
export async function tryRenderEqcMagazineViaCreationTemplate(
  report: EventQuickCheckReportModel,
): Promise<CreationEqcMagazinePdfResult> {
  if (!isEqcCreationMagazineTemplateEnabled()) {
    return { ok: false, reason: 'EQC_CREATION_MAGAZINE_TEMPLATE disabled' };
  }
  const platformProjectId = report.meta.platformProjectId?.trim();
  if (!platformProjectId) {
    return { ok: false, reason: 'missing platformProjectId' };
  }

  let template: CreationMagazineTemplate | null;
  try {
    template = await fetchPublishedQuickCheckMagazineTemplate(platformProjectId);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'template fetch failed',
    };
  }
  if (!template) return { ok: false, reason: 'no published template' };

  const bound = bindEqcReportToMagazineScene(
    template.sceneSnapshot,
    report,
    template.slotSchema,
  );

  try {
    const pdf = await renderCreationMagazinePdfFromScene(bound);
    if (!pdf) return { ok: false, reason: 'creation pdf render failed' };
    return {
      ok: true,
      pdf,
      templateId: template.templateId,
      version: template.version,
      source: 'creation-template',
    };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'creation pdf error',
    };
  }
}
