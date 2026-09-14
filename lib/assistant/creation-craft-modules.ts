/**
 * Creation craft modules — composable procedures under a format playbook.
 * Spec: specs/domain/assistant-creation-agi-lite.md § Wave B (modules)
 * Knowledge: knowledge/creation-craft-playbook-scenarios-next.md
 *
 * Format playbooks stay top-level (quality job). Modules inject only when triggered
 * (progressive disclosure — max 3 per turn).
 */

import type { CreationCraftPlaybookId } from '@/lib/assistant/creation-craft-playbooks';
import { promptLooksLikeWireframeBrief } from '@/lib/assistant/creation-craft-playbooks';

export type CreationCraftModuleId =
  | 'restyle_densify_v1'
  | 'wireframe_layout_v1'
  | 'pdp_detail_v1'
  | 'social_proof_row_v1'
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
  /\b(happy\s*customers?|social[\s_-]?proof|logo[\s_-]?row|trust\s*(bar|row|strip)|kundenlogos?|referenzen[\s_-]?logos?|testimonial|kundenstimmen|4[\s_-]?up\s*(icons?|logos?)|icon[\s_-]?reihe)\b/i;

const PRICING_RE =
  /\b(pricing|preise|preis\s*tabelle|price\s*(table|grid|tier|card)|tarif|pl[aä]ne|plans?\s*(table|grid|tier)|vergleich\s*preise|pricing\s*comparison|kosten\s*pl[aä]ne)\b/i;

const CONTACT_STRIP_RE =
  /\b(contact\s*(us|strip|bar|form)|kontakt(\s*(formular|leiste|bar|strip))?|demo\s*anfragen|newsletter\s*signup|email\s*capture|input\s*\+\s*(button|cta)|anfrage[\s_-]?formular)\b/i;

const MODULE_CATALOG: Record<CreationCraftModuleId, CreationCraftModule> = {
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
 * Restyle → wireframe → PDP → social → pricing → contact.
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
  if (promptLooksLikeWireframeBrief(userPrompt)) push('wireframe_layout_v1');
  if (promptLooksLikePdp(userPrompt)) push('pdp_detail_v1');
  if (promptLooksLikeSocialProof(userPrompt)) push('social_proof_row_v1');
  if (promptLooksLikePricing(userPrompt)) push('pricing_compare_v1');
  if (promptLooksLikeContactStrip(userPrompt)) push('contact_strip_v1');

  return out;
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

export function buildCreationCraftModulesPromptBlock(
  moduleIds: CreationCraftModuleId[] | null | undefined,
): string {
  if (!moduleIds?.length) return '';
  const parts = moduleIds.map((id) => {
    switch (id) {
      case 'restyle_densify_v1':
        return bodyRestyleDensify();
      case 'wireframe_layout_v1':
        return bodyWireframeLayout();
      case 'pdp_detail_v1':
        return bodyPdpDetail();
      case 'social_proof_row_v1':
        return bodySocialProofRow();
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
