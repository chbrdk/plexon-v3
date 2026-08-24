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
Nutze die verfügbaren Tool-Runden für Qualität — nicht nur den ersten gültigen Insert.
Phasen (wenn sinnvoll in eigenen apply_ops-Batches):
1. Struktur — Pages/Sections/Grids/Stacks mit klarer Hierarchie
2. Inhalt — Instances aus Palette/Masters, echte Labels/CTAs, keine leeren Platzhalter-Stapel
3. Polish — Token-Bindings wo passend, Spacing/Typo-Hierarchie, fehlende CTAs/Badges ergänzen
Bevorzuge Masters/insert_instance und wiederkehrende Patterns statt flacher Text-Ketten.
Neue Seite/PDP: add_page zuerst, dann auf dem neuen Root bauen.

### Content-complete (Pflicht bei Produkt-/Landing-Seiten)
insert_child merged Palette-Defaults — trotzdem Props mit echtem Inhalt setzen (Defaults allein = unfertig).
Marketing/PDP → **Site Kit** bevorzugen. creation_editor_palette liefert seedProps + contentHint.
- SiteButton: props.children = CTA („In den Warenkorb“, „Jetzt kaufen“)
- SiteText: props.role=display|title|body|label + props.children
- SiteInput/SiteTextarea: props.placeholder
- SiteSelect: props.placeholder + props.options als Zeilen („S\\nM\\nL“)
- SiteImage: props.src + props.alt (Bild-Platzhalter)
- SiteBadge/SiteCheckbox/SiteLink: props.children (+ href bei Link)
- SiteGrid/SiteStack: columns bzw. direction + gap
Legacy nur wenn nötig: Select options=[{value,label}] + size; Spacer size+axis; Button-Label = Kind-Text-Slot.
PDP-Checklist: Gallery (SiteImage) · Titel/Preis (SiteText) · Variante (SiteSelect mit Optionen) · CTA (SiteButton) · Kurztext — keine leeren unlabeled Atoms.`;
}
