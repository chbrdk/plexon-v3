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
**Greenfield Landing/Homepage:** Bevorzuge **ein** vollständiges HTML (inline CSS oder einfache \`.class\`-Regeln in \`<style>\`) → \`creation_scene_import_html\` → audit → preview. **Layout:** Nav/Header/Stats/CTA-Zeilen mit \`display:flex; flex-direction:row; gap:…\` (inline oder Klasse). Benefits/Metrics 3-spaltig: \`display:grid\` oder row-flex. Danach nur kleine \`apply_ops\`-Fixes.
Phasen (eigene Batches; Import zählt als Schreib-Runde):
0. Optional Brand-Pack — \`creation_brand_tokens_get\` (wenn Collection-Pack sinnvoll). **Nicht blockierend** — freies Styling geht ohne Pack/ohne neue Tokens.
1. Inspiration (wenn Spirion-Tools verfügbar) — spirion_references_search / spirion_screens_search für **Homepage/Landing** (Struktur/Copy; nicht 1:1). **Leere Treffer = normal auf Staging** → sofort Editorial-Fallback (siehe unten), **max. 1 Search-Runde**, dann Import.
${buildEditorialLandingFallbackBrief()}
2. **Erstentwurf** — greenfield: \`creation_scene_import_html\` mit einem HTML-Dokument (\`pageName\` optional für neue Seite). Sonst: add_page / SiteStack / Sections via ops.
3. Inhalt nachziehen — nur wenn Import/ops Lücken lassen: **insert_child mit echten props**. Bare insert_instance = verboten für Seiten-Copy.
4. **Look & Feel (frei erlaubt)** — bei Ops: Farben/Abstände/Radii bewusst setzen (siehe „Freies Styling“). Import liefert Literale bereits. Site-Kit-Fixture nicht als fertiges Branding belassen. Hero-Image: \`set_style\` width/height großzügig (kein Mini-Placeholder 320×180).
5. Self-Check — **creation_scene_content_audit** aufrufen; bei error-Findings set_prop / Inserts nachziehen bis ok (Warnings ok nach Fix-Versuch)
6. Pixel-Check — **creation_scene_preview** (max. 1–2×): kompaktes WebP Vision. Bei Preview-error / network: **nur Audit**, Pixel-QA nicht behaupten, Turn trotzdem abschließen.
7. Abschluss — Tree neu lesen; kurz sagen ob Import und/oder Literale/Token-Bindings genutzt wurden. Non-empty import \`warnings\` dem User nennen.

Neue Seite/PDP: \`pageName\` am Import **oder** add_page zuerst, dann unter neuem root.id bauen.

### Freies Styling (Hex / Abstände — ohne Token anlegen)
Wie im Inspector: **Literale in \`props\`**, Paint-Merge = Tokens dann **Props überschreiben Tokens**.
1. Farbe/Fill: \`set_prop\` key=\`background\`|\`color\`|\`borderColor\` value=\`#RRGGBB\` (oder \`rgb(...)\`). Wenn noch ein Token auf dem Key liegt → zusätzlich \`clear_token_binding\` für denselben Key (wie die UI).
2. Spacing/Radius/Typo-Literale: \`set_prop\` key=\`gap\`|\`padding\`|\`paddingTop\`|…|\`radius\`|\`fontSize\`|\`fontWeight\`|\`lineHeight\`|\`fontFamily\` value z. B. \`24\`, \`1.5rem\`, \`12px\`, \`700\`, Fontname.
3. Gap-Enums der Layout-Props bleiben ok (\`sm\`/\`md\`/…), wenn passend.
4. \`set_style\` = **nur** \`width\` / \`height\` (Zahlen, px). Kein Hex über set_style.
5. **Kein** neues Brandion-Token anlegen nötig. Pack-Tokens (\`set_token_binding\`) sind optional — nutzen wenn Pack passt und wiederverwendbar sein soll.
6. Site-Kit-Defaults (Fixture-Orange/\`color.black\`) = Startpunkt, nicht Endzustand: durch Literale oder Bindings ersetzen.

Beispiel-Ops (CTA frei):
\`{ "op":"set_prop", "nodeId":"<btn>", "key":"background", "value":"#0B3D2E" }\`
\`{ "op":"clear_token_binding", "nodeId":"<btn>", "key":"background" }\`
\`{ "op":"set_prop", "nodeId":"<btn>", "key":"color", "value":"#F7F6F2" }\`
\`{ "op":"clear_token_binding", "nodeId":"<btn>", "key":"color" }\`

### VERBOTENE End-Copy (Master-/Palette-Seeds — dürfen NICHT auf der Fläche bleiben)
„Get started“, „Option A“, „Option B“, alleiniges „Text“, alleiniges „Link“, generisches „New“, „Button“, „Email“, „Select“, „Image“, „Message“.
Wenn so etwas nach dem Bau noch sichtbar wäre → set_prop / props überschreiben BEVOR du fertig meldest.

### Content-complete — bevorzugter Weg
Marketing/PDP: **insert_child** Site Kit + props im selben Op (nicht nur Type).
Beispiel (E-Bike PDP — anpassen an Nutzerprompt):
- SiteText role=title children=\"Urban Glide E-Bike\"
- SiteText role=body children=\"2.999 € · Reichweite 80 km\"
- SiteBadge children=\"Neuheit\"
- SiteSelect placeholder=\"Rahmengröße\" options=\"S\\nM\\nL\\nXL\"
- SiteSelect placeholder=\"Farbe\" options=\"Graphit\\nSand\\nOcean\"
- SiteButton children=\"In den Warenkorb\"
- SiteLink children=\"Finanzierung anfragen\" href=\"#\"
- SiteImage alt=\"E-Bike Seitenansicht\" (src aus Seed ok, alt MUSS produktspezifisch sein)

Prop-Cheat:
- SiteButton/SiteBadge/SiteCheckbox/SiteLink → props.children (+ href bei Link)
- SiteText → props.role + props.children
- SiteInput/SiteTextarea → props.placeholder
- SiteSelect → props.placeholder + props.options (Zeilen)
- SiteImage → props.src + props.alt
- SiteGrid/SiteStack → columns / direction / gap

### insert_instance nur mit Inhalt
Nur wenn Master nötig: insert_instance { masterId, parentId, props: { children|options|… } } im selben Op,
oder sofort set_prop auf die neue Instance-ID. Nackte Instances = Seed-Copy → unfertig.

### Pflicht vor Abschluss
1. Look & Feel bewusst gesetzt (Literale und/oder Token-Bindings) — nicht nur Site-Kit-Fixture belassen.
2. creation_scene_content_audit(sceneId) — bei ok=false Fehler beheben und erneut auditen.
3. creation_scene_preview(sceneId) — Vision auf dem WebP; max. 2 Preview-Runden; bei error-Feld nur Audit nutzen.
4. Vision **nicht** ok bei: grauem Wireframe, Mini-Platzhalter-Bild, reinem Site-Kit-Default-Chrome ohne bewusste Farben/Abstände, Seed-Copy/fehlende CTAs.
5. PDP-Checklist: Galerie+alt · Titel/Preis · Varianten-Selects mit echten Optionen · CTA-Label · Nav-Links mit Labels — null Seed-Text.
Nicht fertig melden solange Audit error-Findings hat oder Vision offensichtliche Seed-Copy/fehlende CTAs/Wireframe zeigt.`;
}
