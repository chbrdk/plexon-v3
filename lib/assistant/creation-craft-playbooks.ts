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
  /\b(landing|landingpage|startseite|homepage|home\s*page|hero|pdp|product\s*detail|product\s*page|produktdetail|produktseite|\blp\b|wireframe|skizze|sketch|bioframe|layout[\s_-]?brief|restyle|re-?style|densif\w*|verdicht\w*|nachzieh\w*|dichter|polish|polier\w*|bestehend\w*|existing\s+page|happy\s*customers?|social[\s_-]?proof|logo[\s_-]?row|trust\s*(bar|row|strip)|kundenlogos?|pricing|preise|preis\s*tabelle|price\s*(table|grid|tier)|tarif|pl[aä]ne|contact\s*(us|strip|bar|form)|kontakt|demo\s*anfragen)\b|\b(bau|build|erstelle|create|gestalte|umsetz)\w*.*\b(seite|page|webseite|website|wireframe|skizze)\b/i;

/** User attached / described a layout sketch (not the thin gray anti-pattern). */
export function promptLooksLikeWireframeBrief(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return /\b(wireframe|skizze|sketch|bioframe|hand[\s_-]?drawn|layout[\s_-]?brief|papier[\s_-]?skizze|rahmen[\s_-]?skizze)\b/i.test(
    text,
  );
}

const SHARED_FINISH = `
### Pflicht vor Abschluss (alle Formate)
1. \`creation_scene_content_audit\` — errors + Seed-Copy fixen.
2. \`creation_scene_craft_debug\` — \`craft-thin\` = nicht fertig.
3. \`creation_scene_preview\` — max. 1–2× (Fehler soft-skip, Aufruf trotzdem Pflicht).
4. Kein Seed: „Get started“, „Option A/B“, Fixture-Orange, Noto-only als einziges System.
5. Orchestrator Quality-Gate kann den Turn zurückschicken — dann Fixes, nicht „fertig“ behaupten.
6. \`creation_scene_apply_ops\`: \`ops\` **muss ein natives Array** sein (kein JSON-String). Nur spezifizieren ohne Write = Fail.
`.trim();

const SHARED_STYLING = `
### Freies Styling
Literale in \`props\` (\`background\`/\`color\`/\`gap\`/\`radius\`/\`fontSize\`/…). \`set_style\` nur width/height.
`.trim();

function phasesLanding(): string {
  return `
## Craft-Playbook: Web Landing (\`creation_landing_v1\`)
Ziel: freistehende Web-Landing/PDP — **Site\\*** / HTML, nicht Print.

### Default Hero (automatisch — Nutzer muss das NICHT detailliert prompten)
Above-the-fold = **Full-Bleed Media Hero mit Overlay-Copy**, nicht Textspalte + kleines Bild — **außer** Nutzer liefert Wireframe/Skizze (dann gilt § Wireframe-Vertrag unten und überschreibt Overlay-Default).
- **Import-sicher:** Foto als \`background-image\` (CSS) am Hero-Stack — Scrim + \`url(…)\` layered, \`background-size: cover\`, \`min-height: 100vh\` (mind. 720px), \`display:flex; flex-direction:column; justify-content:flex-end\`, Padding ~64–72px.
- Copy (Eyebrow / Display ≥56px / Body / Primary+Secondary CTA) als **normale Kinder** im Flex-Flow — Text liegt **auf** dem Bild.
- **Typo Fallgefühl (Display):** Body darf \`line-height: 1.5–1.6\` haben — Display **nicht**. Auf ≥48px Type **explizit** \`line-height: 1.05–1.12\` + leicht negatives \`letter-spacing\` (−0.01…−0.03em). Umbrüche in einer Headline müssen als **eine Form** wirken, nicht als gelockerte Zeilen. Stack-Gap Eyebrow→Display→Lede eng (8–16px), Section-Gaps größer.
- Stock-URL ok (Unsplash w=1920) wenn keine Marken-Assets; \`alt\`/Caption fachlich.
- Gallery/Slider-Optik: Caption + Dots + Prev/Next als Chrome **im** Hero; **keine** \`position:absolute|fixed\` Slides im HTML-Import (\`ignored-absolute-position\` → flache Bildstreifen). Absolute nur danach via \`apply_ops\` wenn nötig.
- Breakpoint **Desktop** (\`activeBreakpoint=desktop\`) — nicht Print/A4 für Web-Heroes.
- \`craft_debug.hasHeroMedia\` zählt Stack-\`backgroundImage\` mit \`url(\` — dünne \`SiteImage\`-Streifen ohne Masse reichen nicht.

### Wireframe / Skizze = Layout-Vertrag (wenn angehängt oder beschrieben)
Nutzer-Wireframe ≠ verbotenes Grau-Wireframe-Look. Skizze = **Section-Order + Constraints**; Umsetzung = fertiges Craft (Hex, Type, echte Media), nicht Kästen mit X.
1. **Zuerst lesen:** Section-Reihenfolge top→bottom 1:1 (Header → Hero → Social/Happy → Mid-Media → Contact/Footer). Keine Extra-Mega-Nav / Produkt-IA erfinden, die nicht in der Skizze steht.
2. **Platzierung:** Steht Headline+CTA **über** dem Hero-Bild (nicht Overlay) → so bauen (gestapelter Hero). Overlay-Default nur ohne Skizze.
3. **Zeichenlimits:** Annotationen wie „max 40 chars headline“ / „subheader max 135“ hart einhalten (Spaces zählen). Zu lange Display-Zeilen kürzen.
4. **Bild-Slots:** große Rechtecke = große \`SiteImage\` oder Stack-\`backgroundImage\` mit Dashboard-/Produkt-Foto (Unsplash/Brand ok) — keine leeren X-Kästen, keine Tiny-Thumbnails.
5. **Icon-Reihen:** 4 Smileys / Logos = \`SiteGrid\` oder row-Stack mit 4 Zellen + darunter CTA („More“).
6. **Contact-Bar:** Input + Primary-Button in einer Zeile; catchy Section-Title wenn annotiert.
7. Abschluss: kurz Section-Map nennen (1…n) und bestätigen dass Limits + Order getroffen wurden.

Phasen:
0. Eigenes Design-System (Hex/Typo/Spacing) — **kein** Brandion-Pfad auf Greenfield. Bei Wireframe: zuerst Section-Map aus der Skizze.
1. Optional Spirion \`captures_list\` → \`capture_prompt_pack\` (Rhythm/Look; eigene Literale).
2. \`creation_scene_import_html\` — ein HTML-Dokument; Hero laut Default **oder** Wireframe-Vertrag; body font + page BG.
3. Polish nur bei Lücken: \`insert_child\` mit echten props / \`set_prop\`.
4. Audit → craft_debug → preview.
5. Pattern nur auf expliziten Wunsch: \`creation_site_kit_page_save\`.

**Muss:** Hero-Masse = Display ≥48px **UND** Full-Bleed Media (\`backgroundImage\` url am Hero-Stack oder großes SiteImage). Text-only Heroes = Fail. Display-Leading eng (nicht Body-1.6). Bei Wireframe: Section-Order + Char-Limits.
**Verboten:** PrintPage/PrintCover als Landing-Ersatz; **dünnes Grau-Wireframe-Look** (leere Kästen/X als Endzustand); Seed-Copy; Absolute-Overlay-Hero nur im HTML-Import; Print-Channel für Web-Landing; lange Text-Scrolls ohne Foto-Hero; Display mit geerbtem Body-\`line-height\`; Skizzen-Order ignorieren und Default-Overlay-Landing drüberbügeln.
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
- **Emphasis (P92):** prefer \`PrintChip tone=accent|solid\` for active dimensions (**not** \`PrintChipRow.accent\`); \`PrintCallout variant=wash|emphasize|quiet\`; \`PrintTable columnAlign=left,left,right\`; \`PrintSteps\` RankedRow children + \`emphasisIndex\` — **never** invent SiteStack/SVG diagrams inside \`PrintPage\` for Mag smoke.
- **Write:** \`creation_scene_apply_ops\` with native \`ops\` array — documenting a tree without apply is failure.
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
- **P92 prop shapes (exact):**
  - \`PrintChip\` shell \`tone\`: \`default|muted|accent|solid\` — **not** \`PrintChipRow.accent\`.
  - \`PrintCallout\` shell \`variant\`: \`wash|emphasize|quiet\` + slotted label/body Text — **not** \`headline\`.
  - \`PrintTable\` shell \`columnAlign\`: string like \`left,left,right\` (or array) — **not** \`columns[].align\`.
  - \`PrintSteps\` children = \`RankedRow\` (label + secondary) · shell \`orientation\` · \`emphasisIndex\` string — **not** bare Stack children.
- Numeric/EUR columns: \`PrintTable columnAlign\` ending in \`right\` (z. B. \`left,left,right\`).
- Process: \`PrintSteps\` (+ optional \`emphasisIndex\`) — **forbid** SiteStack/SVG diagrams inside \`PrintPage\` as Mag substitute.
- Brandion print channel bevorzugen — **no hardcoded conference pink/orange hex** (\`#ff6a3b\` etc.).
- Mehrere \`PrintPage\`s ok (Cover → Domain → GEO → Personas).
- **MUST call \`creation_scene_apply_ops\`** with a native \`ops\` **array** (never a JSON string). Documenting the tree without apply_ops is a failed turn.

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
