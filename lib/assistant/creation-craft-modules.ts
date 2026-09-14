/**
 * Creation craft modules — composable procedures under a format playbook.
 * Spec: specs/domain/assistant-creation-agi-lite.md § Wave B (modules)
 * Knowledge: knowledge/creation-craft-playbook-scenarios-next.md
 * Spirion meta: knowledge/creation-craft-spirion-section-modules.md
 *
 * Format playbooks stay top-level (quality job). Modules inject only when triggered
 * (progressive disclosure — max 3 per turn).
 */

import type { CreationCraftPlaybookId } from '@/lib/assistant/creation-craft-playbooks';
import { promptLooksLikeWireframeBrief } from '@/lib/assistant/creation-craft-playbooks';

export type CreationCraftModuleId =
  | 'spirion_section_ref_v1'
  | 'restyle_densify_v1'
  | 'wireframe_layout_v1'
  | 'nav_chrome_v1'
  | 'stats_metrics_v1'
  | 'pdp_detail_v1'
  | 'social_proof_row_v1'
  | 'testimonial_quote_v1'
  | 'faq_accordion_v1'
  | 'feature_bento_v1'
  | 'blog_list_v1'
  | 'pricing_compare_v1'
  | 'contact_strip_v1';

export type CreationCraftModule = {
  id: CreationCraftModuleId;
  label: string;
  /** Formats this module may attach to. Empty = any format playbook. */
  playbookIds: CreationCraftPlaybookId[] | '*';
};

const RESTYLE_RE =
  /\b(restyle|re-?style|densif\w*|verdicht\w*|nachzieh\w*|polier\w*|polish|dichter|tighten|improve\s+(the\s+)?(existing|current)|bestehend\w*\s+(landing|seite|page|hero)|existierend\w*\s+(landing|seite|page))\b/i;

const PDP_RE =
  /\b(pdp|product\s*detail|produktdetail|product\s*page|produktseite|buy\s*box|add[\s_-]?to[\s_-]?cart|warenkorb|sku|produkt\s*detail)\b/i;

const SOCIAL_PROOF_RE =
  /\b(happy\s*customers?|social[\s_-]?proof|logo[\s_-]?row|trust\s*(bar|row|strip)|kundenlogos?|referenzen[\s_-]?logos?|4[\s_-]?up\s*(icons?|logos?)|icon[\s_-]?reihe)\b/i;

const TESTIMONIAL_QUOTE_RE =
  /\b(testimonial|kundenstimme(n)?|zitat|quote(\s*(block|section))?|customer\s*quote|press[\s_-]?quote|stimmen|review\s*quote)\b/i;

const BLOG_LIST_RE =
  /\b(blog(\s*(list|feed|index|teaser|grid))?|news(\s*(list|feed|section|teaser))?|artikel[\s_-]?(liste|teaser|grid|übersicht)?|editorial\s*list|press[\s_-]?(list|teaser)|beiträge|posts?\s*(list|grid|teaser)|artikelübersicht)\b/i;

const PRICING_RE =
  /\b(pricing|preise|preis\s*tabelle|price\s*(table|grid|tier|card)|tarif|pl[aä]ne|plans?\s*(table|grid|tier)|vergleich\s*preise|pricing\s*comparison|kosten\s*pl[aä]ne)\b/i;

const CONTACT_STRIP_RE =
  /\b(contact\s*(us|strip|bar|form)|kontakt(\s*(formular|leiste|bar|strip))?|demo\s*anfragen|newsletter\s*signup|email\s*capture|input\s*\+\s*(button|cta)|anfrage[\s_-]?formular)\b/i;

const NAV_CHROME_RE =
  /\b(nav(igation)?(\s*(bar|chrome|header))?|top[\s_-]?nav|site[\s_-]?header|header[\s_-]?(bar|nav|chrome)|men[uü](\s*(bar|leiste))?|navbar|hauptmen[uü]|men[uü]leiste)\b/i;

const STATS_METRICS_RE =
  /\b(stats?(\s*(grid|row|strip|band|bar))?|metrics?(\s*(strip|row|band|bar))?|kpi[s]?|zahlen(band|reihe|zeile)?|kennzahlen|key[\s_-]?figures?|impact[\s_-]?numbers?|metric[\s_-]?strip|zahlen[\s_-]?grid)\b/i;

const FAQ_ACCORDION_RE =
  /\b(faq|f\.?a\.?q\.?|häufige\s*fragen|fragen\s*(&|und)\s*antworten|q\s*&\s*a|q\s*and\s*a|accordion|hilfe[\s_-]?fragen)\b/i;

const FEATURE_BENTO_RE =
  /\b(bento|feature[\s_-]?bento|feature[\s_-]?(grid|cards?|row|section)|vorteile|capabilities?\s*(grid|section)|asymmetric\s*grid|2\+1\s*(grid|layout)|uneven\s*(grid|bento)|feature[\s_-]?cards?)\b/i;

/** Explicit Spirion / design-ref phrasing (module also auto-attaches on landing/newsletter). */
const SPIRION_REF_RE =
  /\b(spirion|capture[_]?prompt[_]?pack|captures?[_]?list|look[_]?contract|page[_]?rhythm|design[\s_-]?referenz|best[\s_-]?practice|wie\s+spirion|visual\s+ref|craft\s+ref)\b/i;

const MODULE_CATALOG: Record<CreationCraftModuleId, CreationCraftModule> = {
  spirion_section_ref_v1: {
    id: 'spirion_section_ref_v1',
    label: 'Spirion Section Reference',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  restyle_densify_v1: {
    id: 'restyle_densify_v1',
    label: 'Restyle / Densify',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  wireframe_layout_v1: {
    id: 'wireframe_layout_v1',
    label: 'Wireframe Layout Contract',
    playbookIds: ['creation_landing_v1'],
  },
  nav_chrome_v1: {
    id: 'nav_chrome_v1',
    label: 'Nav / Header Chrome',
    playbookIds: ['creation_landing_v1'],
  },
  stats_metrics_v1: {
    id: 'stats_metrics_v1',
    label: 'Stats / Metrics Strip',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  pdp_detail_v1: {
    id: 'pdp_detail_v1',
    label: 'PDP / Product Detail',
    playbookIds: ['creation_landing_v1'],
  },
  social_proof_row_v1: {
    id: 'social_proof_row_v1',
    label: 'Social Proof / Logo Row',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  testimonial_quote_v1: {
    id: 'testimonial_quote_v1',
    label: 'Testimonial / Quote',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  faq_accordion_v1: {
    id: 'faq_accordion_v1',
    label: 'FAQ / Accordion',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  feature_bento_v1: {
    id: 'feature_bento_v1',
    label: 'Feature Bento / Vorteile',
    playbookIds: ['creation_landing_v1'],
  },
  blog_list_v1: {
    id: 'blog_list_v1',
    label: 'Blog / News List',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
  pricing_compare_v1: {
    id: 'pricing_compare_v1',
    label: 'Pricing / Comparison',
    playbookIds: ['creation_landing_v1'],
  },
  contact_strip_v1: {
    id: 'contact_strip_v1',
    label: 'Contact Strip / Form',
    playbookIds: ['creation_landing_v1', 'creation_newsletter_v1'],
  },
};

const MAX_MODULES_PER_TURN = 3;

export function promptLooksLikeRestyle(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return RESTYLE_RE.test(text);
}

export function promptLooksLikePdp(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return PDP_RE.test(text);
}

export function promptLooksLikeSocialProof(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return SOCIAL_PROOF_RE.test(text);
}

export function promptLooksLikeTestimonialQuote(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return TESTIMONIAL_QUOTE_RE.test(text);
}

export function promptLooksLikeBlogList(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return BLOG_LIST_RE.test(text);
}

export function promptLooksLikePricing(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return PRICING_RE.test(text);
}

export function promptLooksLikeContactStrip(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return CONTACT_STRIP_RE.test(text);
}

export function promptLooksLikeNavChrome(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return NAV_CHROME_RE.test(text);
}

export function promptLooksLikeStatsMetrics(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return STATS_METRICS_RE.test(text);
}

export function promptLooksLikeFaqAccordion(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return FAQ_ACCORDION_RE.test(text);
}

export function promptLooksLikeFeatureBento(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return FEATURE_BENTO_RE.test(text);
}

export function promptLooksLikeSpirionRef(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return SPIRION_REF_RE.test(text);
}

/** Landing/newsletter always get Spirion meta (best-practice refs before craft). */
export function shouldAttachSpirionSectionRef(
  playbookId: CreationCraftPlaybookId | null | undefined,
  userPrompt?: string | null,
): boolean {
  if (playbookId !== 'creation_landing_v1' && playbookId !== 'creation_newsletter_v1') {
    return false;
  }
  // Always on for these formats; explicit phrasing is documentation/eval only.
  void userPrompt;
  return true;
}

function moduleAllowedOnPlaybook(
  mod: CreationCraftModule,
  playbookId: CreationCraftPlaybookId | null,
): boolean {
  if (!playbookId) return false;
  if (mod.playbookIds === '*') return true;
  return mod.playbookIds.includes(playbookId);
}

/**
 * Resolve modules for this turn. Order = priority. Cap at MAX_MODULES_PER_TURN.
 * Restyle → Spirion → wireframe → nav → stats → PDP → social → testimonial → faq → bento → blog → pricing → contact.
 */
export function resolveCreationCraftModules(
  userPrompt: string | null | undefined,
  playbookId: CreationCraftPlaybookId | null | undefined,
): CreationCraftModuleId[] {
  const pb = playbookId ?? null;
  if (!pb) return [];
  const out: CreationCraftModuleId[] = [];

  const push = (id: CreationCraftModuleId) => {
    if (out.includes(id)) return;
    if (!moduleAllowedOnPlaybook(MODULE_CATALOG[id], pb)) return;
    if (out.length >= MAX_MODULES_PER_TURN) return;
    out.push(id);
  };

  if (promptLooksLikeRestyle(userPrompt)) push('restyle_densify_v1');
  if (shouldAttachSpirionSectionRef(pb, userPrompt)) push('spirion_section_ref_v1');
  if (promptLooksLikeWireframeBrief(userPrompt)) push('wireframe_layout_v1');
  if (promptLooksLikeNavChrome(userPrompt)) push('nav_chrome_v1');
  if (promptLooksLikeStatsMetrics(userPrompt)) push('stats_metrics_v1');
  if (promptLooksLikePdp(userPrompt)) push('pdp_detail_v1');
  if (promptLooksLikeSocialProof(userPrompt)) push('social_proof_row_v1');
  if (promptLooksLikeTestimonialQuote(userPrompt)) push('testimonial_quote_v1');
  if (promptLooksLikeFaqAccordion(userPrompt)) push('faq_accordion_v1');
  if (promptLooksLikeFeatureBento(userPrompt)) push('feature_bento_v1');
  if (promptLooksLikeBlogList(userPrompt)) push('blog_list_v1');
  if (promptLooksLikePricing(userPrompt)) push('pricing_compare_v1');
  if (promptLooksLikeContactStrip(userPrompt)) push('contact_strip_v1');

  return out;
}

function bodySpirionSectionRef(): string {
  return `
## Craft-Modul: Spirion Section Reference (\`spirion_section_ref_v1\`)
Ziel: **Best-Practice-Look aus Spirion** bevor gebaut/restyled wird — nicht aus dem Bauch.

### Pflicht (vor HTML-Import / großen apply_ops)
1. \`spirion_captures_list\` (limit ~12; **kein** \`platformProjectId\` / \`digProjectId\`).
2. 1–2 Captures wählen, die zur **aktuellen Section/Job** passen (Hero / Pricing / Nav / Trust — nicht random).
3. \`spirion_capture_prompt_pack\` mit \`output_contract: both\` → \`look_contract\` + \`page_rhythm\` lesen.
4. Ableiten in **eigene** Hex/Type/Spacing-Literale (kein 1:1 Fremdmarken-Clone).
5. \`look_contract.avoid\` ernst nehmen (z. B. kein equal three-up als ganze Page).
6. Bei Import: \`craftMeta.spirion\` mit \`captureIds\` + Kurz-Avoid setzen.

### Editorial-Fallback
Nur wenn \`captures_list\` wirklich \`captures: []\` — dann trotzdem eigenes Design-System erfinden; **nicht** nach Search-0 abbrechen.

### Mit Restyle
Erst Pack lesen, dann gezielte \`apply_ops\` — kein Full-Reimport nur wegen Spirion.
`.trim();
}

function bodyRestyleDensify(): string {
  return `
## Craft-Modul: Restyle / Densify (\`restyle_densify_v1\`)
Ziel: **Bestehende** Page verbessern — kein Greenfield-Neubau.

### Override (hart)
1. Zuerst \`creation_scene_tree_index\` + \`creation_scene_craft_debug\` (Ist-Zustand lesen).
2. **Prefer** \`creation_scene_apply_ops\` / \`set_prop\` / gezielte \`insert_child\` / \`remove_node\`.
3. **Kein** volles \`creation_scene_import_html\` der ganzen Page — außer Tree leer/Seed-only **oder** Nutzer verlangt explizit Neuschreiben/„von null“.
4. Section-Order der bestehenden Page behalten, sofern keine Wireframe-Skizze mitgeliefert ist.
5. Abschluss: kurz auflisten was geändert wurde (Props/Nodes) — nicht „neue Landing gebaut“.

### Densify-Checkliste
- Display ≥48px: \`lineHeight\` 1.05–1.12 + leicht negatives \`letterSpacing\` (Fallgefühl).
- Hero-Media: Stack \`backgroundImage\` (scrim+url) oder großes SiteImage — Text-only fixen.
- Gaps: Eyebrow→Display→Lede 8–16px; Section-Gaps größer lassen.
- Surfaces/Grid nachziehen wenn \`craft-thin\` / \`craft-few-surfaces\` / \`craft-no-grid\`.
- Seed-Copy / Fixture-Orange / Noto-only ersetzen.
`.trim();
}

function bodyWireframeLayout(): string {
  return `
## Craft-Modul: Wireframe Layout (\`wireframe_layout_v1\`)
Nutzer-Skizze = **Layout-Vertrag** (überschreibt Default-Overlay-Hero).

1. Section-Order top→bottom 1:1 aus der Skizze — keine Extra-Mega-Nav erfinden.
2. Headline+CTA **über** Bild wenn so gezeichnet (gestapelter Hero).
3. Zeichenlimits aus Annotationen hart (Spaces zählen).
4. Bild-Slots = echte Media-Masse (Dashboard/Produkt), keine X-Kästen.
5. Icon-Reihen / Contact-Bar wie gezeichnet.
6. Fertiges Craft (Hex, Fallgefühl) — nicht Papier-Look.
`.trim();
}

function bodyPdpDetail(): string {
  return `
## Craft-Modul: PDP / Product Detail (\`pdp_detail_v1\`)
Ziel: Produktdetail — **nicht** generische Marketing-Landing. Gate bleibt \`landing\` (Hero-Masse + CTA).

### Section-Map (Desktop, top→bottom)
1. **Nav** schlank (Marke + wenige Links) — keine Mega-IA.
2. **Product hero:** große Media (Gallery oder Full-Bleed Stack-\`backgroundImage\`) + Display-Name (Fallgefühl) + Kurz-Benefit + **Primary Buy/CTA** (\`SiteButton\`).
3. **Specs / Benefits:** \`SiteGrid\` 2–3 Spalten mit echten Labels (nicht „Feature A/B“).
4. Optional **Social proof** (Logo-Row / Quote) — wenn Prompt es verlangt, Modul \`social_proof_row_v1\` beachten.
5. Optional **Related / Bundle** Strip.
6. **Sticky oder Footer-CTA** wiederholen (gleicher Label-Ton).

### Hart
- Mind. ein großes Produkt-Media + Display ≥48px + echte CTA (Buy / Demo / Anfragen — kein „Get started“).
- Keine Print*-Nodes. Desktop-Breakpoint.
- Copy konkret (Produktname, Nutzen) — keine Seed-Optionen.
`.trim();
}

function bodySocialProofRow(): string {
  return `
## Craft-Modul: Social Proof / Logo Row (\`social_proof_row_v1\`)
Ziel: Trust-Band wie „Happy Customers“ — **4 Zellen in einer Reihe**, nicht drei gleiche Feature-Cards als ganze Page.

### Pattern
1. Section-Title (kurz) + optional Sub ≤~135 Zeichen.
2. **\`SiteGrid\` columns=4** (oder row-Stack gap eng) mit 4 Zellen: Logo/\`SiteImage\` **oder** Icon+Label — gleiche Zellenhöhe, echte Surfaces.
3. Darunter optional Secondary CTA („More“ / „Referenzen“).
4. Keine leeren X-Kästen; keine 200px-Thumb-Streifen als einzige Media der Page.

### Wenn nur dieses Modul (Restyle)
- Bestehende Section suchen und per \`apply_ops\` nachziehen — nicht die ganze Landing neu importieren.
`.trim();
}

function bodyPricingCompare(): string {
  return `
## Craft-Modul: Pricing / Comparison (\`pricing_compare_v1\`)
Ziel: Preis-/Plan-Vergleich als **dichte Grid-Section**, nicht Fließtext-Liste.

### Pattern
1. Catchy Section-Title (kurz) + optional Sub ≤~135 Zeichen.
2. **\`SiteGrid\` 2–4 Spalten** (typisch 3 Tiers): je Zelle Name · Preis · 3–5 Bullet-Benefits · **Primary CTA** (\`SiteButton\`, z. B. „Starten“ / „Demo“ — kein „Get started“).
3. Eine Zelle darf **emphasized** sein (Accent-Border/BG) — Recommended/Popular.
4. Zahlen rechtsbündig wirkend (klare Preis-Hierarchie); Display nur für Section-Title, Tier-Namen eher Title/Body-Gewicht.
5. Optional Footnote / „jährlich sparen“ Microcopy unter dem Grid.

### Hart
- Echte Plan-Namen + Preise (Literale), keine „Option A/B“.
- Jede Tier-Zelle hat CTA. Char-Disziplin auf Labels.
- Bei Restyle: Section per \`apply_ops\` nachziehen.
`.trim();
}

function bodyContactStrip(): string {
  return `
## Craft-Modul: Contact Strip / Form (\`contact_strip_v1\`)
Ziel: Abschluss-Band wie Wireframe „contact us“ — **eine Zeile** Input + Primary-Button, catchy Title darüber.

### Pattern
1. Catchy Section-Title (nicht „Contact“ allein — Nutzen/Outcome).
2. **Row-Stack:** \`SiteInput\`/\`SiteText\`-Feld (Email/Name) + \`SiteButton\` („Contact us“ / „Demo anfragen“ / „Senden“).
3. Optional 3 kleine Footer-Icons/Links rechts darunter (Social/Legal) — nicht die Hauptstory.
4. Surfaces klar vom Page-BG absetzen; enge Gaps in der Bar.

### Hart
- Echte CTA-Labels. Kein Seed „Get started“.
- Nicht als volle Multi-Field-Form aufblasen, außer Nutzer fordert Formular explizit.
- Mit Restyle: bestehende Bar per \`apply_ops\` verdichten — kein Full-Reimport.
`.trim();
}

function bodyNavChrome(): string {
  return `
## Craft-Modul: Nav / Header Chrome (\`nav_chrome_v1\`)
Ziel: **schlanke** Top-Chrome — Marke + wenige Links + optional Primary CTA. Keine Mega-IA.

### Pattern
1. Eine horizontale Reihe: Logo/Wortmarke links · 2–5 Links Mitte/rechts · optional \`SiteButton\` (Primary).
2. Conversion-Landing: Links eher **In-Page-Anker** (Features / Preise / Kontakt) — keine Exit-Ramps zu Fremdseiten/Social.
3. Homepage/Wireframe mit Menü: trotzdem **nicht** Dropdown-Mega-Menü erfinden, außer Skizze zeigt es.
4. Höhe kompakt (≈56–72px); klare Surface vom Hero; Sticky nur wenn Prompt/Skizze es verlangt.

### Hart
- Kein 8+-Link-Footer als „Nav“. Kein Seed „Get started“ als einziger Label.
- Bei Restyle: bestehende Header-Nodes per \`apply_ops\` verdichten.
`.trim();
}

function bodyStatsMetrics(): string {
  return `
## Craft-Modul: Stats / Metrics Strip (\`stats_metrics_v1\`)
Ziel: Kennzahlen-Band — **3–4 Metrics in einer Reihe**, jede Zahl+Label als **eine** Text-Shape (nicht „3“ und „+“ getrennt).

### Pattern
1. Optional kurzer Section-Eyebrow/Title darüber.
2. **\`SiteGrid\` columns=3 oder 4** (oder row-Stack): je Zelle große Zahl (Display/Title-Gewicht) + kurzes Label darunter.
3. Konkrete Zahlen („98%“, „40k+“, „12 Länder“) — keine „XX%“ / „N Customers“.
4. Enge Gaps in der Reihe; Section-Abstand zum Hero/Proof darunter größer.
5. Nicht die ganze Page als equal three-up Features verkaufen — das ist nur das Metrics-Band.

### Hart
- Keine Icon-Feature-Cards als Ersatz für Stats.
- Mit Restyle: Band per \`apply_ops\` nachziehen; Spirion-Pack für Rhythm nutzen wenn aktiv.
`.trim();
}

function bodyFaqAccordion(): string {
  return `
## Craft-Modul: FAQ / Accordion (\`faq_accordion_v1\`)
Ziel: Fragen-Block als **vertikaler Stack** — nicht als equal three-up Cards.

### Pattern
1. Catchy Section-Title („Fragen?“ / Outcome) + optional Sub ≤~135 Zeichen.
2. **4–8 Rows** untereinander: Frage (Title-Gewicht) + kurze Antwort (Body, Fallgefühl-frei).
3. Visuell: Hairline/Surface je Row; enge Gaps; optional „+“/Chevron als Text/Icon — kein echtes DOM-Accordion nötig.
4. Copy konkret zur Marke/Produkt — keine „Lorem“ / „Question 1“.
5. Optional CTA unter dem Stack („Noch Fragen? Contact us“).

### Hart
- Kein 3-Spalten-Feature-Grid als FAQ-Ersatz.
- Mit Restyle: bestehende FAQ-Nodes per \`apply_ops\` verdichten.
`.trim();
}

function bodyFeatureBento(): string {
  return `
## Craft-Modul: Feature Bento / Vorteile (\`feature_bento_v1\`)
Ziel: Feature/Vorteile-Section mit **ungleichem** Raster (Bento / 2+1) — **kein** equal three-up als ganze Page.

### Pattern
1. Section-Title + optional Sub.
2. Layout-Familien mischen: z. B. große Zelle (Media oder Lead-Benefit) + 2 kleinere; oder 2×2 mit einer spanning Zelle.
3. Je Zelle: kurzer Benefit-Titel + 1 Satz; optional Icon/\`SiteImage\` — echte Surfaces.
4. Mind. eine Zelle mit mehr Masse (Media oder Display) als die anderen.
5. Danach Rhythm wechseln (Quote / Stats / CTA) — nicht nochmal dasselbe Grid.

### Hart
- \`look_contract.avoid\` equal three-up ernst nehmen.
- Keine „Feature A/B/C“ Seed-Labels.
- Bei Restyle: Section per \`apply_ops\` nachziehen.
`.trim();
}

function bodyTestimonialQuote(): string {
  return `
## Craft-Modul: Testimonial / Quote (\`testimonial_quote_v1\`)
Ziel: **Zitat-Section** — Quote + Name/Rolle — **nicht** Logo-Row.

### Pattern
1. Optional Eyebrow („Kundenstimme“ / „Press“).
2. Großes Quote (Display/Title-Gewicht, Fallgefühl) — 1–3 Sätze, echte Stimme.
3. Darunter Attribution: Name · Rolle/Firma (Body); optional kleines Portrait/\`SiteImage\`.
4. Eine starke Quote pro Band (oder max. 2 stacked) — kein 3er-Karten-Grid aus Zitaten.
5. Optional Secondary CTA („Mehr Referenzen“).

### Hart
- Kein Ersatz durch \`social_proof_row_v1\` Logo-Strip.
- Keine Seed-Namen („Jane Doe“) wenn Prompt/Marke konkrete Namen hergibt — sonst glaubwürdige Platzhalter + Rolle.
- Mit Restyle: Quote-Nodes per \`apply_ops\` verdichten.
`.trim();
}

function bodyBlogList(): string {
  return `
## Craft-Modul: Blog / News List (\`blog_list_v1\`)
Ziel: Editorial-Liste — Titel + Meta + Teaser, nicht Feature-Bento.

### Pattern
1. Section-Title („Insights“ / „News“ / „Aus dem Blog“) + optional „Alle ansehen“-Link/CTA.
2. **3–6 Rows** (oder 2–3 Card-Teaser in einer Reihe): Datum/Tag · Headline · 1-Satz-Teaser; optional Thumb \`SiteImage\`.
3. Klare Typo-Hierarchie (Headline Title, Meta klein, Teaser Body).
4. Rhythm: Liste/Teaser-Grid **eine** Layout-Familie — danach andere Section (nicht nochmal gleiche Cards).

### Hart
- Keine leeren „Post 1/2/3“ Seed-Titel.
- Nicht als equal three-up Feature-Benefits verkaufen (\`feature_bento_v1\` ist anders).
- Mit Restyle: Liste per \`apply_ops\` nachziehen.
`.trim();
}

export function buildCreationCraftModulesPromptBlock(
  moduleIds: CreationCraftModuleId[] | null | undefined,
): string {
  if (!moduleIds?.length) return '';
  const parts = moduleIds.map((id) => {
    switch (id) {
      case 'spirion_section_ref_v1':
        return bodySpirionSectionRef();
      case 'restyle_densify_v1':
        return bodyRestyleDensify();
      case 'wireframe_layout_v1':
        return bodyWireframeLayout();
      case 'nav_chrome_v1':
        return bodyNavChrome();
      case 'stats_metrics_v1':
        return bodyStatsMetrics();
      case 'pdp_detail_v1':
        return bodyPdpDetail();
      case 'social_proof_row_v1':
        return bodySocialProofRow();
      case 'testimonial_quote_v1':
        return bodyTestimonialQuote();
      case 'faq_accordion_v1':
        return bodyFaqAccordion();
      case 'feature_bento_v1':
        return bodyFeatureBento();
      case 'blog_list_v1':
        return bodyBlogList();
      case 'pricing_compare_v1':
        return bodyPricingCompare();
      case 'contact_strip_v1':
        return bodyContactStrip();
      default:
        return '';
    }
  }).filter(Boolean);
  if (!parts.length) return '';
  return `
### Aktive Craft-Module (diese Turn)
${parts.join('\n\n')}
`.trim();
}

export function listCreationCraftModules(): CreationCraftModule[] {
  return Object.values(MODULE_CATALOG);
}
