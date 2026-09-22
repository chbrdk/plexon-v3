/**
 * Creation craft memory → Collection Knowledge Pack (AGI-lite Wave C).
 * Spec: specs/domain/assistant-creation-agi-lite.md § Wave C
 * Transport: research_brief.sections[] (collection-memory-wave1.md)
 */

import { runtimeEnv } from '@/lib/runtime-env';
import {
  KNOWLEDGE_PACK_SCHEMA_VERSION,
  mergeFacetData,
  ensureFacetsShape,
  normalizeResearchBriefData,
  type ResearchBriefData,
  type ResearchSection,
} from '@/lib/collection-knowledge-pack';
import {
  getOrCreateKnowledgePack,
  patchKnowledgePackFacet,
} from '@/lib/db/collection-knowledge-packs';
import type { CreationCraftPlaybookId } from '@/lib/assistant/creation-craft-playbooks';
import type {
  CreationQualityToolTrace,
  CreationSceneQualityJob,
} from '@/lib/assistant/creation-scene-quality';

export const CREATION_CRAFT_PREFS_SECTION_ID = 'creation-craft-prefs-latest' as const;
export const CREATION_LANDING_RECIPE_SECTION_ID = 'creation-landing-recipe-latest' as const;
export const CREATION_NEWSLETTER_RECIPE_SECTION_ID = 'creation-newsletter-recipe-latest' as const;
export const CREATION_PRINT_RECIPE_SECTION_ID = 'creation-print-recipe-latest' as const;

export const CREATION_CRAFT_MEMORY_SECTION_IDS = [
  CREATION_CRAFT_PREFS_SECTION_ID,
  CREATION_LANDING_RECIPE_SECTION_ID,
  CREATION_NEWSLETTER_RECIPE_SECTION_ID,
  CREATION_PRINT_RECIPE_SECTION_ID,
] as const;

const HYDRATE_MAX_CHARS = 2_800;

/** Default on; set ASSISTANT_CREATION_CRAFT_MEMORY=0/off to disable publish+hydrate. */
export function isAssistantCreationCraftMemoryEnabled(): boolean {
  const raw = runtimeEnv('ASSISTANT_CREATION_CRAFT_MEMORY').toLowerCase();
  if (!raw) return true;
  return !(raw === '0' || raw === 'false' || raw === 'off' || raw === 'disabled' || raw === 'no');
}

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '_');
}

function previewOf(
  traces: CreationQualityToolTrace[],
  match: (n: string) => boolean,
): string {
  for (let i = traces.length - 1; i >= 0; i--) {
    const t = traces[i];
    if (!t) continue;
    if (match(normalizeToolName(t.name))) return t.preview ?? '';
  }
  return '';
}

function wroteScene(traces: CreationQualityToolTrace[]): boolean {
  return traces.some((t) => {
    const n = normalizeToolName(t.name);
    return (
      n.includes('import_html') ||
      n.includes('apply_ops') ||
      n.includes('site_kit_page_save') ||
      n.includes('site_kit_composition_save')
    );
  });
}

function tryParseJson(preview: string): Record<string, unknown> | null {
  if (!preview.trim()) return null;
  try {
    const v = JSON.parse(preview) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export type CreationCraftExtract = {
  usedHtmlImport: boolean;
  colors: string[];
  fonts: string[];
  gaps: string[];
  maxFontSizePx: number | null;
  hasLargeDisplay: boolean;
  hasHeroMedia: boolean;
  nodeCount: number | null;
  printPageCount: number;
  hasWebCta: boolean;
  craftFlags: string[];
  avoid: string[];
};

/** Deterministic extract from tool traces (no LLM). */
export function extractCreationCraftMemoryFromTraces(
  traces: CreationQualityToolTrace[],
): CreationCraftExtract {
  const craftPreview = previewOf(traces, (n) => n.includes('craft_debug'));
  const treePreview = previewOf(
    traces,
    (n) => n.includes('tree_index') || n.includes('scene_tree'),
  );
  const usedHtmlImport = traces.some((t) =>
    normalizeToolName(t.name).includes('import_html'),
  );

  const parsed = tryParseJson(craftPreview);
  const bundle =
    parsed?.bundle && typeof parsed.bundle === 'object' && !Array.isArray(parsed.bundle)
      ? (parsed.bundle as Record<string, unknown>)
      : parsed;
  const design =
    bundle?.designSystem && typeof bundle.designSystem === 'object'
      ? (bundle.designSystem as Record<string, unknown>)
      : {};
  const stats =
    bundle?.sceneStats && typeof bundle.sceneStats === 'object'
      ? (bundle.sceneStats as Record<string, unknown>)
      : {};

  const asStringList = (raw: unknown, n: number): string[] =>
    Array.isArray(raw)
      ? raw
          .map((x) => String(x).trim())
          .filter(Boolean)
          .slice(0, n)
      : [];

  const craftFlagsRaw = bundle?.craftFlags;
  const craftFlags = Array.isArray(craftFlagsRaw)
    ? craftFlagsRaw.map((f) => {
        if (typeof f === 'string') return f;
        if (f && typeof f === 'object' && 'code' in f) {
          return String((f as { code?: unknown }).code ?? '');
        }
        return '';
      }).filter(Boolean)
    : [];

  const printPageCount = (treePreview.match(/\bPrintPage\b/g) ?? []).length;
  const hasWebCta = /\b(SiteButton|Button|SiteLink|Link)\b/i.test(treePreview);

  const avoid: string[] = [];
  if (craftFlags.some((c) => /craft-thin/i.test(c))) avoid.push('craft-thin / wireframe density');
  if (/get started|option a|noto sans|fixture.?orange/i.test(`${craftPreview}\n${treePreview}`)) {
    avoid.push('seed copy / fixture orange / Noto-only');
  }

  return {
    usedHtmlImport,
    colors: asStringList(design.colors, 8),
    fonts: asStringList(design.fonts, 4),
    gaps: asStringList(design.gaps ?? design.spacing, 6),
    maxFontSizePx:
      typeof stats.maxFontSizePx === 'number' ? stats.maxFontSizePx : null,
    hasLargeDisplay: stats.hasLargeDisplay === true,
    hasHeroMedia: stats.hasHeroMedia === true,
    nodeCount: typeof stats.nodeCount === 'number' ? stats.nodeCount : null,
    printPageCount,
    hasWebCta,
    craftFlags,
    avoid,
  };
}

export type BuildCreationCraftSectionsInput = {
  extract: CreationCraftExtract;
  qualityJob: CreationSceneQualityJob;
  playbookId?: CreationCraftPlaybookId | null;
  userPrompt?: string;
  sceneId?: string | null;
};

export function buildCreationCraftKnowledgeSections(
  input: BuildCreationCraftSectionsInput,
): ResearchSection[] {
  const { extract, qualityJob, playbookId, userPrompt, sceneId } = input;
  const formatLabel =
    qualityJob === 'newsletter'
      ? 'newsletter'
      : qualityJob === 'print'
        ? 'print'
        : qualityJob === 'landing'
          ? 'web-landing'
          : 'generic';

  const prefs: ResearchSection = {
    id: CREATION_CRAFT_PREFS_SECTION_ID,
    title: 'Creation craft prefs (latest)',
    plainText: [
      `format=${formatLabel}`,
      playbookId ? `playbook=${playbookId}` : null,
      sceneId ? `sceneId=${sceneId}` : null,
      userPrompt ? `promptHint=${userPrompt.trim().slice(0, 180)}` : null,
      extract.colors.length ? `colors=${extract.colors.join(', ')}` : null,
      extract.fonts.length ? `fonts=${extract.fonts.join(', ')}` : null,
      extract.gaps.length ? `gaps=${extract.gaps.join(', ')}` : null,
      extract.maxFontSizePx != null ? `maxFontSizePx=${extract.maxFontSizePx}` : null,
      `hasLargeDisplay=${extract.hasLargeDisplay}`,
      `hasHeroMedia=${extract.hasHeroMedia}`,
      extract.nodeCount != null ? `nodeCount=${extract.nodeCount}` : null,
      extract.avoid.length ? `avoid=${extract.avoid.join('; ')}` : null,
      `updatedAt=${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 4_000),
    bullets: [
      `Prefer format=${formatLabel} unless user switches`,
      extract.colors[0] ? `Reuse accent/page colors near ${extract.colors.slice(0, 3).join(' / ')}` : null,
      extract.fonts[0] ? `Typo stack cue: ${extract.fonts[0]}` : null,
      ...extract.avoid.map((a) => `Avoid: ${a}`),
    ].filter((b): b is string => Boolean(b)).slice(0, 12),
  };

  const sections: ResearchSection[] = [prefs];

  if (qualityJob === 'landing' || playbookId === 'creation_landing_v1') {
    sections.push({
      id: CREATION_LANDING_RECIPE_SECTION_ID,
      title: 'Creation landing recipe (latest)',
      plainText: [
        `htmlFirst=${extract.usedHtmlImport}`,
        `cta=${extract.hasWebCta}`,
        `heroMass=${extract.hasLargeDisplay || extract.hasHeroMedia}`,
        extract.maxFontSizePx != null ? `displayPx=${extract.maxFontSizePx}` : null,
        playbookId ? `playbook=${playbookId}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      bullets: [
        extract.usedHtmlImport
          ? 'Greenfield: HTML import then polish ops'
          : 'Ops/insert polish path',
        'Must: hero mass + SiteButton/SiteLink CTA',
        'Default hero: full-bleed backgroundImage (scrim+url, cover, min-height 100vh) + overlay copy — not absolute slides in HTML import',
        'Display Fallgefühl: line-height 1.05–1.12 + slight negative tracking on ≥48px — never inherit body 1.6',
        'User wireframe/sketch = layout contract (section order + char limits); overrides overlay default',
        'Restyle/densify: prefer apply_ops — no full HTML re-import unless empty/seed or explicit rewrite',
        'Desktop breakpoint for web landing — not Print/A4',
        'No Print* for web landing',
      ],
    });
  }

  if (qualityJob === 'newsletter' || playbookId === 'creation_newsletter_v1') {
    sections.push({
      id: CREATION_NEWSLETTER_RECIPE_SECTION_ID,
      title: 'Creation newsletter recipe (latest)',
      plainText: [
        'widthHint=560-640px',
        `cta=${extract.hasWebCta}`,
        `htmlFirst=${extract.usedHtmlImport}`,
        'printNodes=forbidden',
        playbookId ? `playbook=${playbookId}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      bullets: [
        'Single column email stack: preheader → hero → body → CTA → footer',
        'Never PrintPage/PrintCover in newsletter',
        'CTA label must be real (no Get started)',
      ],
    });
  }

  if (
    qualityJob === 'print' ||
    playbookId === 'creation_print_magazine_v1' ||
    playbookId === 'creation_print_report_v1'
  ) {
    sections.push({
      id: CREATION_PRINT_RECIPE_SECTION_ID,
      title: 'Creation print recipe (latest)',
      plainText: [
        `printPageCount=${extract.printPageCount}`,
        playbookId === 'creation_print_report_v1' ? 'kind=report-deck' : 'kind=magazine',
        'channel=print',
        'magPdf=ready-when-PrintPage-present',
        playbookId ? `playbook=${playbookId}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      bullets: [
        'Always PrintPage ancestor for print modules',
        'Prefer Brandion print channel tokens',
        playbookId === 'creation_print_report_v1'
          ? 'Report: tables/ranked/persona + optional dataSlot keys'
          : 'Magazin: Cover/Chapter hierarchy',
      ],
    });
  }

  return sections;
}

export async function distillCreationCraftToKnowledgePack(input: {
  platformProjectId: string | null | undefined;
  actorUserId?: string | null;
  qualityJob: CreationSceneQualityJob;
  playbookId?: CreationCraftPlaybookId | null;
  userPrompt?: string;
  sceneId?: string | null;
  traces: CreationQualityToolTrace[];
}): Promise<
  | { ok: true; sectionIds: string[] }
  | { ok: false; error: string; skipped?: boolean }
> {
  if (!isAssistantCreationCraftMemoryEnabled()) {
    return { ok: false, error: 'craft-memory-disabled', skipped: true };
  }
  const ppid = input.platformProjectId?.trim();
  if (!ppid) {
    return { ok: false, error: 'missing-platform-project-id', skipped: true };
  }
  if (!wroteScene(input.traces)) {
    return { ok: false, error: 'no-scene-writes', skipped: true };
  }

  try {
    const extract = extractCreationCraftMemoryFromTraces(input.traces);
    const sections = buildCreationCraftKnowledgeSections({
      extract,
      qualityJob: input.qualityJob,
      playbookId: input.playbookId,
      userPrompt: input.userPrompt,
      sceneId: input.sceneId,
    });

    const current = await getOrCreateKnowledgePack(ppid);
    const at = new Date().toISOString();
    const facets = ensureFacetsShape(current.facets, at);
    const incoming: Partial<ResearchBriefData> = {
      sections,
      topics: ['creation-craft', input.qualityJob],
      sourceRunId: input.sceneId ?? null,
      sourceProjectId: ppid,
    };
    const mergedData = mergeFacetData(
      'research_brief',
      facets.research_brief.data,
      incoming,
    ) as ResearchBriefData;

    const result = await patchKnowledgePackFacet({
      platformProjectId: ppid,
      facetId: 'research_brief',
      facetDocument: {
        facetId: 'research_brief',
        schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
        updatedAt: at,
        provenance: {
          actorType: 'user',
          actorUserId: input.actorUserId ?? null,
          productId: 'plexon',
          note: 'creation craft memory Wave C distillate',
          runId: input.sceneId ?? null,
          sourceUri: null,
        },
        data: mergedData,
      },
      expectedRevision: current.revision,
      updatedByUserId: input.actorUserId ?? null,
    });

    if (result === 'conflict') {
      await markCreationCraftFreshnessFailed(
        ppid,
        'creation soft-skip:research_brief_revision_conflict',
      );
      return { ok: false, error: 'Knowledge Pack revision conflict' };
    }
    if (!result) {
      await markCreationCraftFreshnessFailed(
        ppid,
        'creation soft-skip:research_brief_not_found',
      );
      return { ok: false, error: 'Knowledge Pack not found' };
    }
    return { ok: true, sectionIds: sections.map((s) => s.id) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (ppid) {
      await markCreationCraftFreshnessFailed(
        ppid,
        `creation soft-skip:research_brief_error:${message}`,
      );
    }
    return { ok: false, error: message };
  }
}

/** Best-effort freshness mark when craft memory distill soft-fails (Wave C). */
async function markCreationCraftFreshnessFailed(
  platformProjectId: string,
  note: string,
): Promise<void> {
  try {
    const current = await getOrCreateKnowledgePack(platformProjectId);
    const at = new Date().toISOString();
    const facets = ensureFacetsShape(current.facets, at);
    const existing = facets.research_brief;
    await patchKnowledgePackFacet({
      platformProjectId,
      facetId: 'research_brief',
      facetDocument: {
        ...existing,
        updatedAt: at,
        freshness: 'publish_failed',
        provenance: {
          ...existing.provenance,
          actorType: 'service',
          productId: 'plexon',
          note: note.slice(0, 500),
        },
      },
      expectedRevision: current.revision,
      updatedByUserId: null,
    });
  } catch {
    // best-effort — never fail the orchestrator path for freshness
  }
}

/** Compact system-prompt hydrate for creation_scene_edit turns. */
export async function buildCreationCraftMemoryHydrateBlock(
  platformProjectId: string | null | undefined,
): Promise<string | null> {
  if (!isAssistantCreationCraftMemoryEnabled()) return null;
  const ppid = platformProjectId?.trim();
  if (!ppid) return null;

  try {
    const row = await getOrCreateKnowledgePack(ppid);
    const brief = normalizeResearchBriefData(
      ensureFacetsShape(row.facets).research_brief.data,
    );
    const wanted = new Set<string>(CREATION_CRAFT_MEMORY_SECTION_IDS);
    const sections = brief.sections.filter((s) => wanted.has(s.id));
    if (!sections.length) return null;

    const lines: string[] = [
      '## Creation Craft Memory (Collection)',
      'Frühere erfolgreiche Craft-Prefs dieser Collection — Format beibehalten, nicht neu erfinden, außer der Nutzer wechselt explizit.',
    ];
    for (const s of sections) {
      lines.push(`### ${s.title}`);
      lines.push(s.plainText.slice(0, 900));
      if (s.bullets?.length) {
        for (const b of s.bullets.slice(0, 6)) {
          lines.push(`- ${b.slice(0, 160)}`);
        }
      }
    }
    let text = lines.join('\n');
    if (text.length > HYDRATE_MAX_CHARS) {
      text = `${text.slice(0, HYDRATE_MAX_CHARS)}\n… [craft memory gekürzt]`;
    }
    return text;
  } catch {
    return null;
  }
}
