/**
 * Materialize EQC report → CREATION pitch slide scene.
 * Spec: specs/domain/eqc-pitch-slides.md
 */
import { getCreationServiceApiUrl, getCreationUrl } from '@/lib/constants';
import { buildBoundEqcPitchSlideScene, bindEqcReportToPitchSlideScene } from '@/lib/assistant/reports/eqc-pitch-slides/build-eqc-pitch-slide-scene';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import type { CreationCompositionScene } from '@/lib/assistant/reports/pdf/magazine/creation-magazine-template-types';
import { fetchPublishedQuickCheckMagazineTemplate } from '@/lib/integrations/creation-magazine-template-client';
import { buildCreationInviteRedirectUrl } from '@/lib/collection-invite-redirect';
import {
  CREATION_API_SCENES,
  CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK_SLIDES,
} from '@/lib/paths/creation-magazine-templates';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

export type MaterializeEqcPitchSlidesResult =
  | {
      ok: true;
      sceneId: string;
      platformProjectId: string;
      editorHref: string;
      pageCount: number;
      source: 'fixture' | 'creation-template';
    }
  | { ok: false; status: number; error: string };

function creationHeaders(actorUserId: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    'X-Plexon-User-Id': actorUserId,
  };
  const secret =
    typeof process !== 'undefined' ? process.env.PLEXON_SERVICE_SECRET?.trim() : '';
  if (secret) headers[PLEXON_SERVICE_SECRET_HEADER] = secret;
  return headers;
}

export async function materializeEqcPitchSlides(input: {
  report: EventQuickCheckReportModel;
  actorUserId: string;
}): Promise<MaterializeEqcPitchSlidesResult> {
  const platformProjectId = String(input.report.meta.platformProjectId || '').trim();
  if (!platformProjectId) {
    return { ok: false, status: 400, error: 'platform_project_required' };
  }

  const base = getCreationServiceApiUrl()?.replace(/\/+$/, '');
  if (!base) {
    return { ok: false, status: 503, error: 'creation_unconfigured' };
  }

  let scene: CreationCompositionScene;
  let source: 'fixture' | 'creation-template' = 'fixture';

  const published = await fetchPublishedQuickCheckMagazineTemplate(
    platformProjectId,
    CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK_SLIDES,
  );
  if (published?.sceneSnapshot) {
    scene = bindEqcReportToPitchSlideScene(
      {
        ...published.sceneSnapshot,
        id: `scene-eqc-pitch-${Date.now().toString(36)}`,
        name: `Pitch · ${input.report.meta.domain || 'Quick Check'}`,
        platformProjectId,
        updatedAt: new Date().toISOString(),
      },
      input.report,
    );
    source = 'creation-template';
  } else {
    scene = buildBoundEqcPitchSlideScene(input.report, {
      name: `Pitch · ${input.report.meta.domain || 'Quick Check'}`,
    });
    scene = { ...scene, platformProjectId };
  }

  const res = await fetch(`${base}${CREATION_API_SCENES}`, {
    method: 'POST',
    headers: creationHeaders(input.actorUserId),
    body: JSON.stringify(scene),
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    scene?: { id?: string };
  };
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.error || `creation_${res.status}`,
    };
  }

  const sceneId = String(body.scene?.id || scene.id).trim();
  if (!sceneId) {
    return { ok: false, status: 502, error: 'creation_scene_missing' };
  }

  const publicBase = (getCreationUrl() || base).replace(/\/+$/, '');
  const editorHref = buildCreationInviteRedirectUrl(publicBase, {
    platformProjectId,
    sceneId,
  });

  return {
    ok: true,
    sceneId,
    platformProjectId,
    editorHref,
    pageCount: scene.pages?.length ?? 1,
    source,
  };
}
