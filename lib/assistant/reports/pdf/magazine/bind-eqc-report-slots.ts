import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas';
import type {
  CreationCompositionScene,
  CreationMagazineTemplateSlotDef,
  CreationSceneNode,
} from '@/lib/assistant/reports/pdf/magazine/creation-magazine-template-types';

/**
 * Bind EQC report fields into a Creation scene snapshot using `props.dataSlot`.
 * Does not touch layout chrome `props.slot`.
 */
export function bindEqcReportToMagazineScene(
  scene: CreationCompositionScene,
  report: EventQuickCheckReportModel,
  slotSchema?: CreationMagazineTemplateSlotDef[],
): CreationCompositionScene {
  const slots =
    slotSchema?.length ?
      slotSchema
    : collectDataSlots(scene.root);

  const byId = new Map(slots.map((s) => [s.nodeId, s]));
  const root = mapNode(scene.root, (node) => {
    const def = byId.get(node.id);
    const dataSlot =
      def?.dataSlot ??
      (typeof node.props?.dataSlot === 'string' ? node.props.dataSlot.trim() : '');
    if (!dataSlot) return node;
    return applyDataSlot(node, dataSlot, report);
  });

  return {
    ...scene,
    root,
    platformProjectId: scene.platformProjectId ?? report.meta.platformProjectId ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function collectDataSlots(node: CreationSceneNode): CreationMagazineTemplateSlotDef[] {
  const out: CreationMagazineTemplateSlotDef[] = [];
  walk(node, out);
  return out;
}

function walk(node: CreationSceneNode, out: CreationMagazineTemplateSlotDef[]): void {
  const raw = node.props?.dataSlot;
  if (typeof raw === 'string' && raw.trim()) {
    out.push({ dataSlot: raw.trim(), nodeId: node.id, nodeType: node.type });
  }
  for (const child of node.children ?? []) walk(child, out);
}

function mapNode(
  node: CreationSceneNode,
  fn: (n: CreationSceneNode) => CreationSceneNode,
): CreationSceneNode {
  const next = fn(node);
  if (!next.children?.length) return next;
  return {
    ...next,
    children: next.children.map((c) => mapNode(c, fn)),
  };
}

function applyDataSlot(
  node: CreationSceneNode,
  dataSlot: string,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  // Site* pitch slides — text list binding (eqc-pitch-slides.md)
  if (node.type === 'SiteStack' || node.type === 'SiteText') {
    const siteBound = bindSitePitchSlot(node, dataSlot, report);
    if (siteBound) return siteBound;
  }
  switch (dataSlot) {
    case 'eqc.cover':
      return bindCover(node, report, true);
    case 'eqc.cover.kpis':
      return bindCover(node, report, false);
    case 'eqc.domain.issues':
      return bindDomainIssuesTable(node, report);
    case 'eqc.domain.comparison':
      return bindDomainComparisonTable(node, report);
    case 'eqc.geo.competitors':
      return bindGeoCompetitorsRanked(node, report);
    case 'eqc.geo.recommendations':
      return bindGeoRecsRanked(node, report);
    case 'eqc.personas':
      return bindPersonaGrid(node, report);
    case 'eqc.persona':
      return bindPersonaCard(node, report, 0);
    default:
      return node;
  }
}

/** Bind EQC fields into SiteStack pitch pages (title/body slots). */
function bindSitePitchSlot(
  node: CreationSceneNode,
  dataSlot: string,
  report: EventQuickCheckReportModel,
): CreationSceneNode | null {
  if (node.type !== 'SiteStack') return null;
  let children = node.children ?? [];
  switch (dataSlot) {
    case 'eqc.cover': {
      const fazit =
        report.executive.fazit || report.insights?.fazit || report.executive.summary || '';
      const kpis = report.executive.kpiTiles
        .slice(0, 4)
        .map((k) => `${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''}`)
        .join(' · ');
      children = setSlotText(children, 'label', 'Quick Check');
      children = setSlotText(children, 'title', report.meta.title || report.meta.domain);
      if (fazit) children = setSlotText(children, 'body', fazit);
      if (kpis) children = setSlotText(children, 'value', kpis);
      return { ...node, children };
    }
    case 'eqc.domain.issues': {
      const issues = report.domain?.topIssues ?? [];
      const lines =
        issues.length === 0
          ? 'Keine Top-Issues im Report.'
          : issues.map((i, idx) => `${idx + 1}. ${i.title} (${i.count})`).join('\n');
      children = setSlotText(children, 'title', 'Top Issues');
      children = setSlotText(children, 'body', lines);
      return { ...node, children };
    }
    case 'eqc.domain.comparison': {
      const rows = report.domainComparison?.rows ?? [];
      const lines =
        rows.length === 0
          ? 'Keine Vergleichsdaten.'
          : rows
              .map((r) => `${r.domain} · ${r.role} · Score ${r.score} · ${r.totalPages} pages`)
              .join('\n');
      children = setSlotText(children, 'title', 'Domain Comparison');
      children = setSlotText(children, 'body', lines);
      return { ...node, children };
    }
    case 'eqc.geo.competitors': {
      const comps = report.geo.competitors ?? [];
      const lines =
        comps.length === 0
          ? 'Keine Competitor-Daten.'
          : comps
              .map((c) => {
                const score =
                  c.score != null ? String(c.score)
                  : c.shareOfVoice != null ? `${c.shareOfVoice}%`
                  : '—';
                return `${c.name} · ${score}`;
              })
              .join('\n');
      children = setSlotText(children, 'title', 'GEO / Share of voice');
      children = setSlotText(children, 'body', lines);
      return { ...node, children };
    }
    case 'eqc.personas': {
      const personas = resolveReportPersonas(report);
      const lines =
        personas.length === 0
          ? 'Keine Personas.'
          : personas
              .slice(0, 4)
              .map((p) => `${p.name}${p.segment ? ` — ${p.segment}` : ''}`)
              .join('\n');
      children = setSlotText(children, 'title', 'Personas');
      children = setSlotText(children, 'body', lines);
      return { ...node, children };
    }
    default:
      return null;
  }
}

function setSlotText(
  children: CreationSceneNode[] | undefined,
  slot: string,
  text: string,
): CreationSceneNode[] {
  const list = children ? [...children] : [];
  const idx = list.findIndex((c) => c.props?.slot === slot);
  if (idx >= 0) {
    const hit = list[idx]!;
    list[idx] = {
      ...hit,
      props: { ...hit.props, slot, children: text },
    };
    return list;
  }
  list.push({
    id: `slot-${slot}-${Math.random().toString(36).slice(2, 7)}`,
    type: hitSiteTextPreferred(list) ? 'SiteText' : 'Text',
    props: { slot, children: text },
  });
  return list;
}

function hitSiteTextPreferred(list: CreationSceneNode[]): boolean {
  return list.some((c) => c.type === 'SiteText' || c.type === 'SiteStack');
}

function bindCover(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
  withCopy: boolean,
): CreationSceneNode {
  let children = node.children ?? [];
  if (withCopy) {
    children = setSlotText(children, 'title', report.meta.title || report.meta.domain);
    children = setSlotText(children, 'label', report.meta.domain || 'Quick Check');
    children = setSlotText(
      children,
      'meta',
      [report.meta.projectName, report.meta.playbookLabel].filter(Boolean).join(' · '),
    );
    const fazit = report.executive.fazit || report.insights?.fazit || report.executive.summary;
    if (fazit) children = setSlotText(children, 'footer', fazit);
  }

  const kpis = report.executive.kpiTiles.slice(0, 4);
  const nonKpi = children.filter((c) => c.type !== 'Lede' && c.type !== 'PrintScoreRing');
  const kpiNodes: CreationSceneNode[] = kpis.map((k, i) => ({
    id: `eqc-kpi-${i}`,
    type: 'Lede' as const,
    children: [
      {
        id: `eqc-kpi-${i}-l`,
        type: 'Text',
        props: { slot: 'label', children: k.label },
      },
      {
        id: `eqc-kpi-${i}-v`,
        type: 'Text',
        props: {
          slot: 'value',
          children: `${k.value}${k.unit ? ` ${k.unit}` : ''}`,
        },
      },
    ],
  }));

  return { ...node, children: [...nonKpi, ...kpiNodes] };
}

function bindDomainIssuesTable(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  const issues = report.domain?.topIssues ?? [];
  return {
    ...node,
    props: {
      ...node.props,
      dataSlot: node.props?.dataSlot,
      columns: ['Issue', 'Count'],
      rows: issues.map((i) => [i.title, i.count]),
    },
  };
}

function bindDomainComparisonTable(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  const rows = report.domainComparison?.rows ?? [];
  return {
    ...node,
    props: {
      ...node.props,
      dataSlot: node.props?.dataSlot,
      columns: ['Domain', 'Role', 'Score', 'Pages'],
      rows: rows.map((r) => [r.domain, r.role, r.score, r.totalPages]),
    },
  };
}

function bindGeoCompetitorsRanked(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  const comps = report.geo.competitors ?? [];
  const body: CreationSceneNode[] = comps.map((c, i) => ({
    id: `eqc-comp-${i}`,
    type: 'RankedRow',
    children: [
      {
        id: `eqc-comp-${i}-l`,
        type: 'Text',
        props: { slot: 'label', children: c.name },
      },
      {
        id: `eqc-comp-${i}-v`,
        type: 'Text',
        props: {
          slot: 'secondary',
          children:
            c.score != null ? String(c.score)
            : c.shareOfVoice != null ? `${c.shareOfVoice}%`
            : '—',
        },
      },
    ],
  }));
  const slotted = (node.children ?? []).filter((c) => typeof c.props?.slot === 'string');
  return { ...node, children: [...slotted, ...body] };
}

function bindGeoRecsRanked(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  const recs = report.geo.recommendations ?? [];
  const body: CreationSceneNode[] = recs.map((r, i) => ({
    id: `eqc-rec-${i}`,
    type: 'RankedRow',
    children: [
      {
        id: `eqc-rec-${i}-l`,
        type: 'Text',
        props: { slot: 'label', children: r.title },
      },
      {
        id: `eqc-rec-${i}-v`,
        type: 'Text',
        props: { slot: 'secondary', children: r.description },
      },
    ],
  }));
  const slotted = (node.children ?? []).filter((c) => typeof c.props?.slot === 'string');
  return { ...node, children: [...slotted, ...body] };
}

function bindPersonaGrid(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
): CreationSceneNode {
  const personas = resolveReportPersonas(report);
  const cards: CreationSceneNode[] = personas.map((p, i) => ({
    id: `eqc-persona-${i}`,
    type: 'PrintPersonaCard',
    children: [
      { id: `eqc-p-${i}-n`, type: 'Text', props: { slot: 'title', children: p.name } },
      {
        id: `eqc-p-${i}-s`,
        type: 'Text',
        props: { slot: 'meta', children: p.segment },
      },
      {
        id: `eqc-p-${i}-b`,
        type: 'Text',
        props: { slot: 'summary', children: p.bio || p.headline || '' },
      },
    ],
  }));
  return { ...node, children: cards };
}

function bindPersonaCard(
  node: CreationSceneNode,
  report: EventQuickCheckReportModel,
  index: number,
): CreationSceneNode {
  const personas = resolveReportPersonas(report);
  const p = personas[index];
  if (!p) return node;
  let children = node.children ?? [];
  children = setSlotText(children, 'title', p.name);
  children = setSlotText(children, 'meta', p.segment);
  children = setSlotText(children, 'summary', p.bio || p.headline || '');
  return { ...node, children };
}
