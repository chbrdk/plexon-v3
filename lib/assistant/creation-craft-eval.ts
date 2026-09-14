/**
 * Creation craft eval harness — fixture mode (CI) + live notes.
 * Spec: specs/domain/assistant-creation-agi-lite.md § Wave D
 */

import { resolveCreationCraftPlaybook } from '@/lib/assistant/creation-craft-playbooks';
import {
  evaluateCreationSceneQuality,
  type CreationQualityToolTrace,
  type CreationSceneQualityJob,
} from '@/lib/assistant/creation-scene-quality';
import { runtimeEnv } from '@/lib/runtime-env';

export type CreationCraftEvalMode = 'off' | 'fixture' | 'live';

export function resolveCreationCraftEvalMode(): CreationCraftEvalMode {
  const raw = runtimeEnv('ASSISTANT_CREATION_EVAL_MODE').toLowerCase();
  if (raw === 'fixture' || raw === 'live' || raw === 'off') return raw;
  return 'off';
}

export type CreationCraftEvalBrief = {
  id: string;
  lang: 'de' | 'en';
  prompt: string;
  category:
    | 'landing'
    | 'pdp'
    | 'newsletter'
    | 'print'
    | 'pattern'
    | 'restyle'
    | 'unbound'
    | 'qa';
  /** Expected playbook id string or null when none. */
  expectedPlaybookId: string | null;
};

/** ≥20 briefs DE/EN across formats (resolver coverage). */
export const CREATION_CRAFT_EVAL_BRIEFS: CreationCraftEvalBrief[] = [
  { id: 'de-landing-01', lang: 'de', prompt: 'Baue eine Landing mit starkem Hero und CTA', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-landing-02', lang: 'en', prompt: 'Build a homepage landing page with hero mass', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-landing-03', lang: 'de', prompt: 'Gestalte die Startseite neu', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-pdp-04', lang: 'en', prompt: 'Create a PDP product page layout', category: 'pdp', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-pdp-05', lang: 'de', prompt: 'Neue Produktdetailseite / PDP im Editor', category: 'pdp', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-restyle-06', lang: 'de', prompt: 'Restyle die bestehende Landing — dichter, kein Wireframe', category: 'restyle', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-restyle-07', lang: 'en', prompt: 'Restyle this landing hero and CTA', category: 'restyle', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-restyle-27', lang: 'de', prompt: 'Bestehende Seite verdichten — Display Fallgefühl und Hero-Media nachziehen, kein Full-Reimport', category: 'restyle', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-restyle-28', lang: 'en', prompt: 'Polish the existing page denser with apply_ops only', category: 'restyle', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-wireframe-29', lang: 'de', prompt: 'Dieses Wireframe 1:1 als Landing umsetzen', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-wireframe-30', lang: 'en', prompt: 'Implement this sketch wireframe layout contract', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-pdp-31', lang: 'de', prompt: 'PDP mit Buy-CTA Specs-Grid und Produktgalerie', category: 'pdp', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-pdp-32', lang: 'en', prompt: 'Product detail page with gallery specs and add to cart', category: 'pdp', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-social-33', lang: 'de', prompt: 'Happy Customers Logo-Row mit 4 Icons und More', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-social-34', lang: 'en', prompt: 'Add a social proof trust bar logo row four-up', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-pricing-35', lang: 'de', prompt: 'Preise Vergleich Grid mit drei Tarifen und CTA', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-pricing-36', lang: 'en', prompt: 'Build a pricing table with three plans', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-contact-37', lang: 'de', prompt: 'Kontaktleiste Contact us mit Input und Demo anfragen', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-contact-38', lang: 'en', prompt: 'Add a contact us strip with name field and button', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-newsletter-08', lang: 'de', prompt: 'Gestalte einen Newsletter für die Kampagne', category: 'newsletter', expectedPlaybookId: 'creation_newsletter_v1' },
  { id: 'en-newsletter-09', lang: 'en', prompt: 'HTML email template with primary CTA', category: 'newsletter', expectedPlaybookId: 'creation_newsletter_v1' },
  { id: 'de-newsletter-10', lang: 'de', prompt: 'E-Mail Digest Mailer einspaltig', category: 'newsletter', expectedPlaybookId: 'creation_newsletter_v1' },
  { id: 'de-print-11', lang: 'de', prompt: 'PrintPage Magazin Cover und Chapter', category: 'print', expectedPlaybookId: 'creation_print_magazine_v1' },
  { id: 'en-print-12', lang: 'en', prompt: 'DIN A4 brochure print layout', category: 'print', expectedPlaybookId: 'creation_print_magazine_v1' },
  { id: 'de-print-13', lang: 'de', prompt: 'Broschüre Drucklayout mit PrintCover', category: 'print', expectedPlaybookId: 'creation_print_magazine_v1' },
  { id: 'de-report-14', lang: 'de', prompt: 'EQC Magazin-PDF Report Deck mit dataSlot', category: 'print', expectedPlaybookId: 'creation_print_report_v1' },
  { id: 'en-report-15', lang: 'en', prompt: 'Whitepaper print report magazine template', category: 'print', expectedPlaybookId: 'creation_print_report_v1' },
  {
    id: 'de-report-p92-25',
    lang: 'de',
    prompt:
      'EQC Magazin-PDF Report mit accent ChipRow, PrintCallout, PrintTable columnAlign right für EUR und PrintSteps emphasisIndex',
    category: 'print',
    expectedPlaybookId: 'creation_print_report_v1',
  },
  { id: 'de-pattern-16', lang: 'de', prompt: 'Seite als Pattern speichern', category: 'pattern', expectedPlaybookId: 'creation_page_as_pattern_v1' },
  { id: 'en-pattern-17', lang: 'en', prompt: 'Save page as pattern please', category: 'pattern', expectedPlaybookId: 'creation_page_as_pattern_v1' },
  { id: 'de-unbound-18', lang: 'de', prompt: 'Baue eine Landing ohne Collection', category: 'unbound', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-qa-19', lang: 'en', prompt: 'What Site Kit compositions are available?', category: 'qa', expectedPlaybookId: null },
  { id: 'de-qa-20', lang: 'de', prompt: 'Zeige die Library Catalog Tags', category: 'qa', expectedPlaybookId: null },
  { id: 'de-landing-21', lang: 'de', prompt: 'Landingpage Hero + Stats Grid bauen', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-newsletter-22', lang: 'en', prompt: 'Build a newsletter digest mailer', category: 'newsletter', expectedPlaybookId: 'creation_newsletter_v1' },
  { id: 'de-landing-23', lang: 'de', prompt: 'Neue Landing mit Hero-Media und Primary CTA', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-landing-24', lang: 'en', prompt: 'Ship a conversion landing with hero and CTA', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'de-landing-25', lang: 'de', prompt: 'Galerie Hero Slider', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
  { id: 'en-landing-26', lang: 'en', prompt: 'Full-bleed photo hero with overlay CTA', category: 'landing', expectedPlaybookId: 'creation_landing_v1' },
];
const denseCraft = JSON.stringify({
  craftFlags: [],
  designSystem: { colors: ['#111', '#f5f0e8', '#2a6'], fonts: ["'Syne', sans-serif"] },
  sceneStats: {
    nodeCount: 24,
    hasLargeDisplay: true,
    hasHeroMedia: true,
    maxFontSizePx: 64,
  },
});

const thinCraft = JSON.stringify({
  craftFlags: ['craft-thin'],
  sceneStats: {
    nodeCount: 18,
    hasLargeDisplay: false,
    hasHeroMedia: false,
    maxFontSizePx: 16,
  },
});

const seedAudit = JSON.stringify({
  ok: true,
  findings: [{ severity: 'warning', code: 'generic-alt', message: 'Get started still visible' }],
});

const spirionTools: CreationQualityToolTrace[] = [
  { name: 'spirion_captures_list', preview: '{"captures":[{"id":"cap_eval1"}]}' },
  { name: 'spirion_capture_prompt_pack', preview: '{"captureIds":["cap_eval1"]}' },
];

export type CreationCraftEvalRecordedTrace = {
  id: string;
  briefId: string;
  label: string;
  qualityJob: CreationSceneQualityJob;
  traces: CreationQualityToolTrace[];
  roundsUsed: number;
  latencyMs: number;
  /** Whether this recording represents a finished successful craft. */
  expectFinished: boolean;
};

/** ≥5 recorded traces for deterministic CI scoring. */
export const CREATION_CRAFT_EVAL_TRACES: CreationCraftEvalRecordedTrace[] = [
  {
    id: 'trace-landing-pass',
    briefId: 'de-landing-01',
    label: 'landing clean pass',
    qualityJob: 'landing',
    roundsUsed: 6,
    latencyMs: 42000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-thin',
    briefId: 'de-landing-03',
    label: 'landing craft-thin fail',
    qualityJob: 'landing',
    roundsUsed: 4,
    latencyMs: 28000,
    expectFinished: false,
    traces: [
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: thinCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-seed',
    briefId: 'en-landing-02',
    label: 'landing seed chrome fail',
    qualityJob: 'landing',
    roundsUsed: 5,
    latencyMs: 31000,
    expectFinished: false,
    traces: [
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: seedAudit },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- CTA [b] SiteButton Get started',
      },
    ],
  },
  {
    id: 'trace-newsletter-print-leak',
    briefId: 'de-newsletter-08',
    label: 'newsletter with Print* fail',
    qualityJob: 'newsletter',
    roundsUsed: 5,
    latencyMs: 33000,
    expectFinished: false,
    traces: [
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Page [p] PrintPage\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-print-pass',
    briefId: 'de-print-11',
    label: 'print magazine pass',
    qualityJob: 'print',
    roundsUsed: 7,
    latencyMs: 51000,
    expectFinished: true,
    traces: [
      { name: 'creation_scene_apply_ops', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Sheet [p1] PrintPage\n  - Cover [c1] PrintCover',
      },
    ],
  },
  {
    id: 'trace-preview-soft-skip',
    briefId: 'de-landing-21',
    label: 'preview tool error soft-skip still pass',
    qualityJob: 'landing',
    roundsUsed: 6,
    latencyMs: 39000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"error":"playwright timeout"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-pass-2',
    briefId: 'en-pdp-04',
    label: 'pdp clean pass',
    qualityJob: 'landing',
    roundsUsed: 7,
    latencyMs: 44000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- PDP [r] SiteStack\n  - Buy [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-pass-3',
    briefId: 'de-restyle-06',
    label: 'restyle landing pass',
    qualityJob: 'landing',
    roundsUsed: 5,
    latencyMs: 36000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_apply_ops', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteLink',
      },
    ],
  },
  {
    id: 'trace-landing-pass-4',
    briefId: 'en-restyle-07',
    label: 'restyle en landing pass',
    qualityJob: 'landing',
    roundsUsed: 5,
    latencyMs: 35000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_apply_ops', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-pass-5',
    briefId: 'de-pdp-05',
    label: 'pdp de clean pass',
    qualityJob: 'landing',
    roundsUsed: 6,
    latencyMs: 41000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- PDP [r] SiteStack\n  - Kaufen [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-pass-6',
    briefId: 'de-landing-23',
    label: 'landing hero-media pass',
    qualityJob: 'landing',
    roundsUsed: 6,
    latencyMs: 40000,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
  {
    id: 'trace-landing-pass-7',
    briefId: 'en-landing-24',
    label: 'conversion landing pass',
    qualityJob: 'landing',
    roundsUsed: 6,
    latencyMs: 40500,
    expectFinished: true,
    traces: [
      ...spirionTools,
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: denseCraft },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
      {
        name: 'creation_scene_tree_index',
        preview: '- Hero [h] SiteStack\n  - CTA [b] SiteButton',
      },
    ],
  },
];
export type CreationCraftEvalCaseScore = {
  id: string;
  briefId: string;
  finished: boolean;
  gate_pass: boolean;
  thin: boolean;
  seed_chrome: boolean;
  preview_ok: boolean;
  rounds_used: number;
  latency_ms: number;
  findings: string[];
};

export type CreationCraftEvalReport = {
  mode: 'fixture';
  briefCount: number;
  playbookResolveHits: number;
  playbookResolveTotal: number;
  playbookResolveRate: number;
  cases: CreationCraftEvalCaseScore[];
  /** Landing-subset gate_pass rate (0–1). */
  landingGatePassRate: number;
  landingThinRate: number;
  medianRoundsUsed: number;
};

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function scoreCreationCraftEvalTrace(
  recording: CreationCraftEvalRecordedTrace,
): CreationCraftEvalCaseScore {
  const verdict = evaluateCreationSceneQuality(recording.traces, {
    job: recording.qualityJob,
  });
  const joined = verdict.findings.join(' ');
  const thin = /craft-thin/i.test(joined) || recording.traces.some((t) => /craft-thin/i.test(t.preview ?? ''));
  const seed_chrome = /Seed-|Fixture-Chrome|Get started/i.test(joined);
  const previewCalled = recording.traces.some((t) =>
    t.name.toLowerCase().replace(/\./g, '_').includes('scene_preview'),
  );
  return {
    id: recording.id,
    briefId: recording.briefId,
    finished: verdict.pass,
    gate_pass: verdict.pass,
    thin,
    seed_chrome,
    preview_ok: previewCalled,
    rounds_used: recording.roundsUsed,
    latency_ms: recording.latencyMs,
    findings: verdict.findings,
  };
}

/** Score playbook resolver against the brief catalog. */
export function scoreCreationCraftEvalBriefs(
  briefs: CreationCraftEvalBrief[] = CREATION_CRAFT_EVAL_BRIEFS,
): { total: number; hits: number; misses: Array<{ id: string; expected: string | null; got: string | null }> } {
  const misses: Array<{ id: string; expected: string | null; got: string | null }> = [];
  let hits = 0;
  for (const b of briefs) {
    const got = resolveCreationCraftPlaybook(b.prompt)?.id ?? null;
    if (got === b.expectedPlaybookId) hits += 1;
    else misses.push({ id: b.id, expected: b.expectedPlaybookId, got });
  }
  return { total: briefs.length, hits, misses };
}

/** Deterministic fixture-mode report for CI. */
export function runCreationCraftEvalFixture(): CreationCraftEvalReport {
  const briefScore = scoreCreationCraftEvalBriefs();
  const cases = CREATION_CRAFT_EVAL_TRACES.map(scoreCreationCraftEvalTrace);
  const landingBriefIds = new Set(
    CREATION_CRAFT_EVAL_BRIEFS.filter((b) => b.category === 'landing' || b.category === 'pdp' || b.category === 'restyle').map(
      (b) => b.id,
    ),
  );
  const landingCases = cases.filter((c) => landingBriefIds.has(c.briefId));
  const landingGatePassRate =
    landingCases.length === 0
      ? 0
      : landingCases.filter((c) => c.gate_pass).length / landingCases.length;
  const landingThinRate =
    landingCases.length === 0 ? 0 : landingCases.filter((c) => c.thin).length / landingCases.length;

  return {
    mode: 'fixture',
    briefCount: briefScore.total,
    playbookResolveHits: briefScore.hits,
    playbookResolveTotal: briefScore.total,
    playbookResolveRate: briefScore.total ? briefScore.hits / briefScore.total : 0,
    cases,
    landingGatePassRate,
    landingThinRate,
    medianRoundsUsed: median(cases.map((c) => c.rounds_used)),
  };
}
