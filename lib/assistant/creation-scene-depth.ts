/**
 * Extra depth for CREATION scene/layout turns only.
 * Spec: specs/domain/assistant-creation-mcp.md § Creative depth
 */
import { getAssistantThinkingBudgetTokens } from '@/lib/constants';

import { buildEditorialLandingFallbackBrief } from './editorial-landing-fallback';

const DEFAULT_MAX_TOOL_ROUNDS = 12;
const DEFAULT_THINKING_BUDGET = 8192;
const MAX_TOOL_ROUNDS_CAP = 16;

/** Planner/orchestrator tool rounds for `creation_scene_edit`. */
export function getCreationSceneMaxToolRounds(): number {
  if (typeof process === 'undefined') return DEFAULT_MAX_TOOL_ROUNDS;
  const raw = process.env.ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS?.trim();
  if (!raw) return DEFAULT_MAX_TOOL_ROUNDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_TOOL_ROUNDS;
  return Math.min(MAX_TOOL_ROUNDS_CAP, Math.max(1, parsed));
}

/**
 * Thinking budget for scene-edit turns.
 * Respects global off (`ANTHROPIC_ASSISTANT_THINKING_BUDGET=0/off`); otherwise
 * at least the Creation floor (default 8192), never below the assistant base.
 */
export function getCreationSceneThinkingBudgetTokens(): number {
  const base = getAssistantThinkingBudgetTokens();
  if (base <= 0) return 0;
  if (typeof process === 'undefined') return Math.max(base, DEFAULT_THINKING_BUDGET);
  const raw = process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET?.trim().toLowerCase();
  if (raw === '0' || raw === 'off' || raw === 'false' || raw === 'disabled') return base;
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_THINKING_BUDGET;
  const creationFloor =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THINKING_BUDGET;
  return Math.max(base, creationFloor);
}

/** Resolve thinking budget for a planner intent (Creation scene-edit only elevated). */
export function resolveAssistantThinkingBudgetForIntent(intent: string): number {
  if (intent === 'creation_scene_edit') return getCreationSceneThinkingBudgetTokens();
  return getAssistantThinkingBudgetTokens();
}

/** System-prompt craft guidance — only for write-capable scene-edit plans. */
export function buildCreationSceneDepthPromptBlock(allowWriteTools: boolean): string {
  if (!allowWriteTools) return '';
  return `
## CREATION Layout-Tiefe (nur dieser Intent)
Nutze die Tool-Runden für Qualität — nicht nur den ersten gültigen Insert.

### Pflicht: Eigenes Design-System erfinden (vor dem HTML)
Greenfield Landing = **freie Art-Direction**, nicht Site-Kit-/Brandion-/MSQDX-Fixture.
**VOR** \`creation_scene_import_html\` kurz intern festlegen und im HTML umsetzen:
1. **Palette (neu):** mind. 4 Hex-Literale — Page-BG · Ink · Muted · Accent(+ ggf. Surface). **Nicht** die MSQDX-Defaults: \`#ff6a3b\` / \`#ff391e\` / Fixture-Orange, \`#0a0a0a\`/\`#0b0b0b\`+\`#f8f8f8\` als Standard-Combo, \`#f7f6f2\` Paper, \`Noto Sans\`. Wähle eine **andere** Stimmung (z. B. warm paper + deep ink, cool slate, olive, indigo, sand, high-contrast editorial …) — Inspiration aus Spirion-Pack-Farben ok, aber **eigene** Hex-Werte schreiben.
2. **Typo (neu):** \`font-family\` auf \`body\`/Root mit **charakteristischer** Stack (Display + Body erlaubt). **Verboten als alleinige Wahl:** \`Noto Sans\`, \`Inter\`, \`Roboto\`, \`Arial\`, nur \`system-ui\`. Beispiele ok: \`'Fraunces', 'Iowan Old Style', Georgia, serif\` · \`'Syne', 'Avenir Next', 'Trebuchet MS', sans-serif\` · \`'IBM Plex Sans', 'Helvetica Neue', sans-serif\` — Stack muss im HTML als Literal stehen (\`font-family:…\` auf body und Headlines).
3. **Spacing/Radius (neu):** eigene Skala in rem/px (nicht nur 16/24/48 und \`0.5rem\` Site-Kit-Radius). Section-Padding und Grid-Gaps bewusst unterschiedlich.
4. **Kein Token-Pfad:** Bei freier Landing **kein** \`creation_brand_tokens_get\`, **kein** \`set_token_binding\`, **kein** Brandion-Token-Name. Nur Hex/rem/px in HTML-Props. Mapping auf Tokens kommt später manuell/Import — nicht jetzt.
5. Abschluss kurz: „Palette: … · Font: … · Spacing: …“ (die erfundenen Werte nennen).

**Greenfield Landing/Homepage:** Entwirf wie eine **freistehende HTML-Seite** (Spirion = Rhythm/Look-Inspiration). Liefere **ein** vollständiges HTML mit **Hex/rem/px-Literalen** → \`creation_scene_import_html\` → audit → preview.
**VERBOTEN im Import-HTML:** \`var(--…)\`, Site-Kit-\`--site-*\`, Brandion-Token-Namen, Fixture-Chrome, MSQDX-Orange-Default, Noto-only.
**Layout:** Nav/Header/Stats/CTA-Zeilen mit \`display:flex; flex-direction:row; gap:…\`. Benefits/Metrics/Cards: \`display:grid; grid-template-columns:repeat(N,minmax(0,1fr)); gap:…\` mit **expliziten** Zell-Hintergründen (\`#…\`). **Page-BG + font-family** auf \`body\` setzen. **Überschriften als ein Textknoten** mit echten Leerzeichen. **Metriken/Logos als ein Textknoten** (\`3+\`, \`MSQ DX\`). Danach nur kleine \`apply_ops\`-Fixes.

### Pflicht: Dichte aus Spirion-Pack (nicht nur Farben)
Nach \`capture_prompt_pack\` **müssen** diese Felder im HTML sichtbar werden:
1. \`look_contract.typography\` — starker Type-Scale-Sprung (Display groß, oft ≥48–80px / clamp; Body klein). Kein einheitliches 16–24px überall.
2. \`page_rhythm\` — unterschiedliche Section-/Band-Höhen; above-fold dominant (Hero mit visueller Masse: große Type und/oder Media-Block). Nicht jede Section mit gleichem 64/96px-Padding.
3. \`look_contract.cta_chrome\` — Outline vs Filled bewusst umsetzen.
4. \`look_contract.avoid\` — genannte Anti-Patterns **nicht** bauen (z. B. „equal three-up card grid as the whole page“).
5. Bei Import optional \`craftMeta.spirion\` setzen (\`captureIds\`, look/rhythm-Kurzform, \`avoid\`) — landet im Craft-Debug-Bundle.
**Verboten als Endzustand:** gleichmäßige Padding-Stapel, Hero nur 2 Textzeilen ohne Masse, drei gleiche Feature-Cards als ganze Seite, Audit-Warning \`craft-thin\` ignorieren.

Phasen (eigene Batches; Import zählt als Schreib-Runde):
0. **Design-System erfinden** (siehe oben) — **nicht** Brand-Pack laden für freie Landings.
1. Inspiration (wenn Spirion-Tools verfügbar) — **Primärpfad:**
   a. \`spirion_captures_list\` (limit ~12; **KEIN** \`platformProjectId\` / \`digProjectId\`).
   b. 1–2 starke Homepage/Landing-Captures → \`spirion_capture_prompt_pack\` (\`output_contract: both\`).
   c. Optional \`spirion_compose_brief\` zum Mergen.
   d. Optional Search — **0 Treffer ≠ Corpus leer**; Captures-Pfad trotzdem.
   e. Pack → **eigene** Hex/Type/Spacing-Literale + **Dichte/Rhythm** ableiten (kein 1:1 Fremdmarken-Clone, kein Zurückfallen auf Fixture-Orange).
   **Editorial-Fallback nur** wenn \`captures_list\` wirklich \`captures: []\` — **nicht** nach Search-0.
${buildEditorialLandingFallbackBrief()}
2. **Erstentwurf** — \`creation_scene_import_html\` (\`pageName\` optional; \`craftMeta.spirion\` wenn Pack genutzt).
3. Inhalt nachziehen nur bei Lücken: **insert_child mit echten props**.
4. **Look & Feel / Dichte** — wenn Import noch Fixture-Nähe oder \`craft-thin\` zeigt: Literale + Type-Scale + Surfaces nachziehen.
5. Self-Check — **creation_scene_content_audit** (auch \`craft-thin\` Warnings lesen)
6. Pixel-Check — **creation_scene_preview** (max. 1–2×)
7. Abschluss — erfundenes System + \`capture_run_id\` + max Hero-px + Grid-Spalten nennen; import \`warnings\` / craftFlags melden.

Neue Seite/PDP: \`pageName\` am Import **oder** add_page zuerst.

### Freies Styling (Hex / Abstände — ohne Token)
**Literale in \`props\`**; Props überschreiben Tokens.
1. Farbe: \`set_prop\` \`background\`|\`color\`|\`borderColor\` = \`#RRGGBB\` (+ \`clear_token_binding\` wenn Binding lag).
2. Spacing/Typo: \`gap\`|\`padding*\`|\`radius\`|\`fontSize\`|\`fontWeight\`|\`lineHeight\`|\`fontFamily\` als Literale.
3. \`set_style\` nur \`width\`/\`height\`.
4. **Kein** Brandion-Token anlegen; **kein** \`set_token_binding\` auf freien Landings.

### VERBOTENE End-Copy
„Get started“, „Option A/B“, alleiniges „Text“/„Link“/„Button“/„Image“/… — vor Abschluss überschreiben.

### Content-complete
Marketing/PDP: **insert_child** mit props. Prop-Cheat: SiteButton/SiteBadge/SiteLink children(+href) · SiteText role+children · SiteSelect options · SiteImage alt · SiteGrid columns/gap.

### Pflicht vor Abschluss
1. Eigenes System + Pack-Dichte sichtbar — Vision **nicht** ok bei MSQDX-Orange+Noto+Near-black-Default oder wireframe-dünnem Hero.
2. creation_scene_content_audit — errors fixen; \`craft-thin\` Warnings ernst nehmen.
3. creation_scene_preview — max. 2×.
4. Kein Wireframe / Seed-Copy / fehlende CTAs.
Nicht fertig melden solange Fixture-Look, Seed-Copy oder offensichtlich dünne Craft sichtbar.`;
}
