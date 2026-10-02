/**
 * Built-in EQC → 16:9 CREATION pitch slide scene (fixture).
 * Spec: specs/domain/eqc-pitch-slides.md
 */
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { bindEqcReportToMagazineScene } from '@/lib/assistant/reports/pdf/magazine/bind-eqc-report-slots';
import type {
  CreationCompositionScene,
  CreationSceneNode,
} from '@/lib/assistant/reports/pdf/magazine/creation-magazine-template-types';

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const PAGE_GAP = 120;

function nid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function text(
  id: string,
  slot: string,
  value: string,
  opts?: { fontSize?: number; color?: string; fontWeight?: number },
): CreationSceneNode {
  return {
    id,
    type: 'SiteText',
    props: {
      slot,
      children: value,
      fontSize: opts?.fontSize ?? 28,
      color: opts?.color ?? '#111111',
      fontWeight: opts?.fontWeight ?? 500,
      lineHeight: opts && opts.fontSize && opts.fontSize >= 48 ? 1.08 : 1.35,
    },
  };
}

function pageRoot(dataSlot: string, children: CreationSceneNode[]): CreationSceneNode {
  return {
    id: nid('root'),
    type: 'SiteStack',
    props: {
      dataSlot,
      direction: 'column',
      gap: 24,
      padding: 64,
      background: '#f7f5f2',
      minHeight: SLIDE_H,
      width: SLIDE_W,
    },
    children,
  };
}

function page(
  name: string,
  index: number,
  dataSlot: string,
  children: CreationSceneNode[],
): NonNullable<CreationCompositionScene['pages']>[number] {
  return {
    id: nid('page'),
    name,
    frame: { x: index * (SLIDE_W + PAGE_GAP), y: 0, width: SLIDE_W, height: SLIDE_H },
    root: pageRoot(dataSlot, children),
  };
}

/** Multi-page 16:9 fixture before data bind (placeholders). */
export function buildEqcPitchSlideSceneSkeleton(
  report: EventQuickCheckReportModel,
  opts?: { sceneId?: string; name?: string },
): CreationCompositionScene {
  const domain = report.meta.domain || 'Quick Check';
  const title = report.meta.title || domain;
  const platformProjectId = String(report.meta.platformProjectId || '').trim();

  const cover = page('Cover', 0, 'eqc.cover', [
    text(nid('t'), 'label', 'Quick Check', { fontSize: 22, color: '#666666' }),
    text(nid('t'), 'title', title, { fontSize: 64, fontWeight: 700 }),
    text(nid('t'), 'body', 'Fazit wird gebunden…', { fontSize: 28 }),
    text(nid('t'), 'value', 'KPIs…', { fontSize: 24, color: '#333333' }),
  ]);

  const issues = page('Issues', 1, 'eqc.domain.issues', [
    text(nid('t'), 'title', 'Top Issues', { fontSize: 48, fontWeight: 700 }),
    text(nid('t'), 'body', 'Issues werden gebunden…', { fontSize: 26 }),
  ]);

  const pages = [cover, issues];

  if ((report.domainComparison?.rows?.length ?? 0) > 0) {
    pages.push(
      page('Comparison', pages.length, 'eqc.domain.comparison', [
        text(nid('t'), 'title', 'Domain Comparison', { fontSize: 48, fontWeight: 700 }),
        text(nid('t'), 'body', 'Comparison…', { fontSize: 26 }),
      ]),
    );
  }

  if ((report.geo?.competitors?.length ?? 0) > 0) {
    pages.push(
      page('GEO', pages.length, 'eqc.geo.competitors', [
        text(nid('t'), 'title', 'Share of voice', { fontSize: 48, fontWeight: 700 }),
        text(nid('t'), 'body', 'Competitors…', { fontSize: 26 }),
      ]),
    );
  }

  if ((report.personas?.length ?? 0) > 0 || report.persona) {
    pages.push(
      page('Personas', pages.length, 'eqc.personas', [
        text(nid('t'), 'title', 'Personas', { fontSize: 48, fontWeight: 700 }),
        text(nid('t'), 'body', 'Personas…', { fontSize: 26 }),
      ]),
    );
  }

  const first = pages[0]!;
  return {
    id: opts?.sceneId ?? nid('scene'),
    name: opts?.name?.trim() || `Pitch · ${domain}`,
    version: 1,
    platformProjectId: platformProjectId || null,
    activeBreakpoint: 'print',
    activePrintPreset: 'slide-16-9',
    pages: pages as CreationCompositionScene['pages'],
    activePageId: first.id,
    root: first.root,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Bind report into skeleton. Walks each page root (multi-page).
 */
export function bindEqcReportToPitchSlideScene(
  scene: CreationCompositionScene,
  report: EventQuickCheckReportModel,
): CreationCompositionScene {
  const pages = scene.pages?.length
    ? scene.pages.map((p) => {
        const bound = bindEqcReportToMagazineScene(
          { ...scene, root: p.root, pages: undefined },
          report,
        );
        return { ...p, root: bound.root };
      })
    : undefined;

  const rootBound = bindEqcReportToMagazineScene(
    { ...scene, pages: undefined },
    report,
  );

  return {
    ...rootBound,
    pages,
    activePageId: scene.activePageId ?? pages?.[0]?.id,
    activeBreakpoint: 'print',
    activePrintPreset: 'slide-16-9',
    platformProjectId: scene.platformProjectId ?? report.meta.platformProjectId ?? null,
  };
}

export function buildBoundEqcPitchSlideScene(
  report: EventQuickCheckReportModel,
  opts?: { sceneId?: string; name?: string },
): CreationCompositionScene {
  return bindEqcReportToPitchSlideScene(buildEqcPitchSlideSceneSkeleton(report, opts), report);
}

export const EQC_PITCH_SLIDE_SIZE = { width: SLIDE_W, height: SLIDE_H } as const;
