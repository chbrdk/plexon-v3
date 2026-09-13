/**
 * Creation craft playbooks — format-aware procedures for scene-edit turns.
 * Spec: specs/domain/assistant-creation-agi-lite.md § Wave B
 *
 * Formats are first-class: web landing, newsletter/email, print magazine, print report.
 * Prompt recipes only (no second scene writer). Quality gate still enforces finish rules.
 */

import type { CreationSceneQualityJob } from '@/lib/assistant/creation-scene-quality';

export type CreationCraftPlaybookId =
  | 'creation_landing_v1'
  | 'creation_newsletter_v1'
  | 'creation_print_magazine_v1'
  | 'creation_print_report_v1'
  | 'creation_page_as_pattern_v1';

export type CreationCraftPlaybook = {
  id: CreationCraftPlaybookId;
  label: string;
  qualityJob: CreationSceneQualityJob;
  /** Short planner reasoning fragment. */
  reasoning: string;
};

const PAGE_AS_PATTERN_RE =
  /\b(seite\s+als\s+pattern|page\s+as\s+pattern|als\s+pattern\s+speichern|save\s+page\s+as\s+pattern|site_kit_page_save|pattern\s+speichern)\b/i;

const NEWSLETTER_RE =
  /\b(newsletter|news\s*letter|e-?mail(\s*template)?|mailer|digest|mailing|kampagnen?\s*mail|html\s*mail)\b/i;

const PRINT_REPORT_RE =
  /\b(eqc\s*mag|magazin[\s_-]?pdf|magazine\s*template|magazineTemplate|quick[\s_-]?check\s*mag|print\s*report|report[\s_-]?deck|datenblatt|whitepaper|gesch[aä]ftsbericht|audit[\s_-]?magazin|dataSlot)\b/i;

const PRINT_MAGAZINE_RE =
  /\b(print\s*page|printpage|printcover|print\s*cover|print\s*chapter|magazin(?!\s*pdf)|magazine(?!\s*template)|brosch[uü]re|flyer|din\s*a4|a4\s*print|print\s*channel|druck(daten|layout| magazin)?|print\s*layout)\b/i;

const LANDING_RE =
  /\b(landing|landingpage|startseite|homepage|home\s*page|hero|pdp|product\s*page|\blp\b)\b|\b(bau|build|erstelle|create|gestalte)\w*.*\b(seite|page|webseite|website)\b/i;

const SHARED_FINISH = `
### Pflicht vor Abschluss (alle Formate)
1. \`creation_scene_content_audit\` — errors + Seed-Copy fixen.
2. \`creation_scene_craft_debug\` — \`craft-thin\` = nicht fertig.
3. \`creation_scene_preview\` — max. 1–2× (Fehler soft-skip, Aufruf trotzdem Pflicht).
4. Kein Seed: „Get started“, „Option A/B“, Fixture-Orange, Noto-only als einziges System.
5. Orchestrator Quality-Gate kann den Turn zurückschicken — dann Fixes, nicht „fertig“ behaupten.
`.trim();

const SHARED_STYLING = `
### Freies Styling
Literale in \`props\` (\`background\`/\`color\`/\`gap\`/\`radius\`/\`fontSize\`/…). \`set_style\` nur width/height.
`.trim();

function phasesLanding(): string {
  return `
## Craft-Playbook: Web Landing (\`creation_landing_v1\`)
Ziel: freistehende Web-Landing/PDP — **Site\\*** / HTML, nicht Print.

Phasen:
0. Eigenes Design-System (Hex/Typo/Spacing) — **kein** Brandion-Pfad auf Greenfield.
1. Optional Spirion \`captures_list\` → \`capture_prompt_pack\` (Rhythm/Look; eigene Literale).
2. \`creation_scene_import_html\` — ein HTML-Dokument; Nav/Hero/CTA/Grid; body font + page BG.
3. Polish nur bei Lücken: \`insert_child\` mit echten props / \`set_prop\`.
4. Audit → craft_debug → preview.
5. Pattern nur auf expliziten Wunsch: \`creation_site_kit_page_save\`.

**Muss:** Hero-Masse (Display ≥48px und/oder großes Media), echte CTA (SiteButton/SiteLink).
**Verboten:** PrintPage/PrintCover als Landing-Ersatz; Wireframe; Seed-Copy.
${SHARED_STYLING}
${SHARED_FINISH}
`.trim();
}

function phasesNewsletter(): string {
  return `
## Craft-Playbook: Newsletter / E-Mail (\`creation_newsletter_v1\`)
Ziel: **E-Mail-taugliche** Einspalten-Komposition — nicht Website, nicht Print-Magazin.

### Format-Regeln (hart)
- Content-Breite **~560–640px** (äußere Stack/Table-Illusion ok; keine Full-Bleed-Web-Hero-Flex-Orgien).
- **Nur** Site\\* / HTML-Import. **VERBOTEN:** \`PrintPage\`, \`PrintCover\`, \`PrintChapter\`, jede \`Print*\`-Node.
- Stack: Preheader (klein, muted) → Logo/Marke → Hero-Headline → 1–2 Body-Blöcke → **Primary CTA** → optional Secondary-Link → Footer (Unsubscribe-Platzhalter-Text ok, aber keine Seed-„Get started“).
- CTA = echte \`SiteButton\`/\`SiteLink\` mit konkretem Label (nicht „Click here“/„Get started“).
- Typo: Display für Subject-Zeile im Hero oft **28–40px** reicht (E-Mail) — trotzdem klarer Sprung Body vs Headline.
- Farben: eigene Hex-Literale; dunkle Footer-Band ok. Kein Fixture-Orange+#Noto als Default.
- Bilder: \`SiteImage\` mit sinnvollem \`alt\`; breite Hero-Images eher voller Spaltenbreite.

Phasen:
0. Kurz Brief: Absender-Marke, Betreff-Idee, eine Primary-CTA-URL/Label, Ton.
1. \`creation_editor_palette\` nur wenn unsicher — sonst HTML-first.
2. \`creation_scene_import_html\` **oder** gezielte \`insert_child\` unter schmalem Root-Stack (\`maxWidth\`/width ~600).
3. Inhalt: Preheader + Hero + Body + CTA + Footer — alles echte Copy.
4. Audit → craft_debug → preview (Preview = Scene-Raster; trotzdem aufrufen).
5. Optional Pattern: \`creation_site_kit_page_save\` wenn Nutzer „als Pattern“ will.

**Muss:** CTA + keine Print\\*-Nodes + keine Seed-Chrome.
**Nicht:** mehrspaltige Desktop-Marketing-Site, Magazin-Folio, DIN-A4.
${SHARED_STYLING}
${SHARED_FINISH}
`.trim();
}

function phasesPrintMagazine(): string {
  return `
## Craft-Playbook: Print Magazin (\`creation_print_magazine_v1\`)
Ziel: **Druck-/Magazin-Seiten** mit CREATION Print-Primitives — PDF-fähig (\`@msqdx/ui/mag\`).

### Format-Regeln (hart)
- Jede Print-Fläche unter **\`PrintPage\`** (P38: andere Print\\*-Drops außerhalb werden gewrappt — lieber bewusst \`PrintPage\` anlegen).
- Palette: \`PrintPage\`, \`PrintCover\`, \`PrintChapter\`, \`PrintPullQuote\`, \`PrintCallout\`, \`PrintSteps\`, \`PrintChip\`/\`PrintChipRow\` (tones \`default|muted|accent|solid\`), \`PrintTwoColumn\`, \`PrintScoreRing\`, \`PrintDonut\`, \`PrintRankedList\`, \`PrintLedger\`, \`PrintTraitBars\`, \`PrintTable\` (\`columnAlign\`), \`PrintPersonaCard\`/\`PrintPersonaGrid\`.
- **Emphasis (P92):** prefer \`PrintChip tone=accent|solid\` for active dimensions; \`PrintCallout\` for wash bands (not PullQuote for non-quotes); \`PrintSteps\` for linear process — **never** invent SiteStack/SVG diagrams inside \`PrintPage\` for Mag smoke.
- **Tokens:** \`creation_brand_tokens_get\` nutzen wenn Collection gebunden — **print**-Channel (mm/pt), nicht digital-Web-Flex. Free Hex nur wenn Pack fehlt.
- Typografie/Spacing denken in **Druck**: Cover-Dominanz, Chapter-Eyebrow/Title/Lede, Folio — nicht Website-Hero mit \`display:flex\` Nav.
- HTML-Import nur wenn er klar Print-Struktur ergibt; sonst **\`insert_child\`** der Print-Typen.
- SiteButton als Web-CTA ist **falsch** für Magazin — Cover/Chapter/Chips tragen die Story.

Phasen:
0. Brief: Seitenzahl (1–3), Cover ja/nein, Kapitel-Titel, KPI-Idee.
1. \`creation_editor_palette\` (Gruppe Print) + optional \`creation_brand_tokens_get\`.
2. Tree: mind. eine \`PrintPage\`; Cover und/oder Chapter mit echter Copy (keine Seed).
3. Dichte: KPI-Ledes / Quote / TwoColumn / ChipRow — nicht leere Paper-Fläche.
4. Audit → craft_debug → preview.
5. Nutzer kann Mag-PDF im Editor exportieren; Agent muss Tree Mag-ready hinterlassen.
6. Pattern optional (\`creation_site_kit_page_save\`) nur auf Wunsch.

**Muss:** \`PrintPage\` im Tree nach Writes; echte Cover/Chapter-Copy; kein Seed.
**Verboten:** reine Site\\*-Landing als „Print“ verkaufen; Newsletter-Spalte als Magazin.
${SHARED_FINISH}
`.trim();
}

function phasesPrintReport(): string {
  return `
## Craft-Playbook: Print Report / Mag-PDF Template (\`creation_print_report_v1\`)
Ziel: **datengebundenes** Print-Deck (EQC Mag, Audit-Report, Whitepaper) — bindbar über \`dataSlot\` / MagazineTemplate.

### Format-Regeln (hart)
- Wie Print Magazin: **\`PrintPage\`**-Stack, Print\\*-Primitives (inkl. P92 \`PrintChip.tone\`, \`PrintCallout\`, \`PrintTable.columnAlign\`, \`PrintSteps\`).
- Plane Slots für späteren Bind (Plexon EQC consume): z. B. Cover (\`eqc.cover\`), Tables (\`eqc.domain.*\`), RankedLists (\`eqc.geo.*\`), PersonaGrid — **layout \`slot\` ≠ \`dataSlot\`**.
- Inhalt: Tabellen/Ranked/Persona mit **echten Platzhalter-Zeilen** (nicht „Option A“); Labels fachlich (Issues, Competitors, Recommendations).
- Numeric/EUR columns: \`PrintTable columnAlign\` ending in \`right\` (z. B. \`left,left,right\`).
- Process: \`PrintSteps\` (+ optional \`emphasisIndex\`) — **forbid** SiteStack/SVG diagrams inside \`PrintPage\` as Mag substitute.
- Brandion print channel bevorzugen.
- Mehrere \`PrintPage\`s ok (Cover → Domain → GEO → Personas).

Phasen:
0. Brief: Report-Art (EQC / Audit / Custom), Seitenfolge, welche Datenblöcke.
1. Palette Print + \`creation_brand_tokens_get\`.
2. Build Cover + 1–n content pages with PrintTable / PrintRankedList / PrintPersona\\* / PrintCallout / PrintSteps / Chip tones.
3. Optional: dokumentiere \`dataSlot\`-Keys in der Abschlussantwort (für Template-Publish).
4. Audit → craft_debug → preview.
5. Mag-PDF-ready; Template-Publish bleibt Produkt-UI/API — Agent liefert bindfähige Scene.

**Muss:** \`PrintPage\` + inhaltliche Report-Module; kein reines Marketing-Hero.
**Verwandt:** \`specs/domain/creation-magazine-template-consume.md\` (Plexon) · Creation \`magazine-template\` / Mag-PDF · \`knowledge/print-report-primitives-agent.md\`.
${SHARED_FINISH}
`.trim();
}

function phasesPageAsPattern(): string {
  return `
## Craft-Playbook: Seite als Pattern (\`creation_page_as_pattern_v1\`)
Ziel: Artboard → Site Kit Pattern persistieren.

Phasen:
1. \`creation_scene_tree_index\` — pageId / updatedAt.
2. Kurz Audit/craft_debug wenn unsicher ob Seed noch offen.
3. \`creation_site_kit_page_save\` (\`sceneId\`, optional \`pageId\`/\`name\`/\`allPages\`).
4. Antwort: exportName, masterId, updatedAt; bei Fehler code/reason zitieren.
5. Kein großes Redesign in diesem Playbook — nur speichern/binden.

${SHARED_FINISH}
`.trim();
}

const CATALOG: Record<CreationCraftPlaybookId, CreationCraftPlaybook> = {
  creation_landing_v1: {
    id: 'creation_landing_v1',
    label: 'Web Landing',
    qualityJob: 'landing',
    reasoning: 'Craft-Playbook Web Landing — HTML-first Site*, Hero+CTA, Quality-Gate landing.',
  },
  creation_newsletter_v1: {
    id: 'creation_newsletter_v1',
    label: 'Newsletter / E-Mail',
    qualityJob: 'newsletter',
    reasoning: 'Craft-Playbook Newsletter — Einspalte ~600px, keine Print*-Nodes, echte CTA.',
  },
  creation_print_magazine_v1: {
    id: 'creation_print_magazine_v1',
    label: 'Print Magazin',
    qualityJob: 'print',
    reasoning: 'Craft-Playbook Print Magazin — PrintPage/Cover/Chapter, print-Channel, Mag-PDF-ready.',
  },
  creation_print_report_v1: {
    id: 'creation_print_report_v1',
    label: 'Print Report / Mag-PDF',
    qualityJob: 'print',
    reasoning: 'Craft-Playbook Print Report — Print-Deck + dataSlot/MagazineTemplate-bewusst.',
  },
  creation_page_as_pattern_v1: {
    id: 'creation_page_as_pattern_v1',
    label: 'Seite als Pattern',
    qualityJob: 'generic',
    reasoning: 'Craft-Playbook Page→Pattern — site_kit_page_save, kein Redesign.',
  },
};

/** Resolve playbook from user phrasing. First match wins (specific → broad). */
export function resolveCreationCraftPlaybook(
  userPrompt: string | null | undefined,
): CreationCraftPlaybook | null {
  const text = userPrompt?.trim() ?? '';
  if (!text) return null;
  if (PAGE_AS_PATTERN_RE.test(text)) return CATALOG.creation_page_as_pattern_v1;
  if (NEWSLETTER_RE.test(text)) return CATALOG.creation_newsletter_v1;
  if (PRINT_REPORT_RE.test(text)) return CATALOG.creation_print_report_v1;
  if (PRINT_MAGAZINE_RE.test(text)) return CATALOG.creation_print_magazine_v1;
  if (LANDING_RE.test(text)) return CATALOG.creation_landing_v1;
  return null;
}

export function getCreationCraftPlaybook(
  id: CreationCraftPlaybookId,
): CreationCraftPlaybook {
  return CATALOG[id];
}

export function listCreationCraftPlaybooks(): CreationCraftPlaybook[] {
  return Object.values(CATALOG);
}

export function qualityJobForCreationCraftPlaybook(
  id: CreationCraftPlaybookId | null | undefined,
): CreationSceneQualityJob | 'auto' {
  if (!id) return 'auto';
  return CATALOG[id].qualityJob;
}

/** System-prompt block for the matched playbook (empty if none). */
export function buildCreationCraftPlaybookPromptBlock(
  playbookId: CreationCraftPlaybookId | null | undefined,
): string {
  if (!playbookId) return '';
  switch (playbookId) {
    case 'creation_landing_v1':
      return phasesLanding();
    case 'creation_newsletter_v1':
      return phasesNewsletter();
    case 'creation_print_magazine_v1':
      return phasesPrintMagazine();
    case 'creation_print_report_v1':
      return phasesPrintReport();
    case 'creation_page_as_pattern_v1':
      return phasesPageAsPattern();
    default:
      return '';
  }
}
