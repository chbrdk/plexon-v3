/**
 * Extra depth for CREATION scene/layout turns only.
 * Spec: specs/domain/assistant-creation-mcp.md § Creative depth
 */
import { getAssistantThinkingBudgetTokens } from '@/lib/constants';

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
Phasen (eigene apply_ops-Batches):
1. Struktur — add_page / SiteStack / SiteGrid / Sections
2. Inhalt — **insert_child mit echten props** (siehe unten). Bare insert_instance = verboten für Seiten-Copy.
3. Polish — Tree neu lesen; jede sichtbare Seed-Copy per set_prop ersetzen; Tokens/Spacing

Neue Seite/PDP: add_page zuerst, dann unter neuem root.id bauen.

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

PDP-Checklist vor Abschluss: Galerie+alt · Titel/Preis · Varianten-Selects mit echten Optionen · CTA-Label · Nav-Links mit Labels — null Seed-Text.`;
}
