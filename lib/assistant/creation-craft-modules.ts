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
  | 'wireframe_layout_v1';

export type CreationCraftModule = {
  id: CreationCraftModuleId;
  label: string;
  /** Formats this module may attach to. Empty = any format playbook. */
  playbookIds: CreationCraftPlaybookId[] | '*';
};

const RESTYLE_RE =
  /\b(restyle|re-?style|densif\w*|verdicht\w*|nachzieh\w*|polier\w*|polish|dichter|tighten|improve\s+(the\s+)?(existing|current)|bestehend\w*\s+(landing|seite|page|hero)|existierend\w*\s+(landing|seite|page))\b/i;

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
};

const MAX_MODULES_PER_TURN = 3;

export function promptLooksLikeRestyle(userPrompt: string | null | undefined): boolean {
  const text = userPrompt?.trim() ?? '';
  if (!text) return false;
  return RESTYLE_RE.test(text);
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
 * Restyle before wireframe when both match (ops-first densify + then structure).
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
