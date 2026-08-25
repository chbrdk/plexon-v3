/**
 * Fallback structure when Spirion library path yields no usable captures/packs.
 * Named editorial references (Linear / Verve / Superhuman) — structure only, no brand clone.
 * Used by creation_scene_edit depth + Spirion connectivity prompts.
 * Spec: assistant-spirion-mcp.md — last resort only after captures_list / prompt_pack fail.
 */
export const EDITORIAL_LANDING_FALLBACK_LABEL =
  'Best-Practice Editorial-Patterns (Linear / Verve / Superhuman)';

/** Agent-facing brief for import-html greenfield landings. */
export function buildEditorialLandingFallbackBrief(): string {
  return `
### Spirion Library leer → ${EDITORIAL_LANDING_FALLBACK_LABEL}
WENN \`spirion_captures_list\` **leer** ist **und** \`capture_prompt_pack\` / Search keine brauchbaren Craft-Hints liefern, DANN **nicht abbrechen** — nutze diese **Struktur** für \`creation_scene_import_html\` (flex/grid wie unten). **Look trotzdem neu erfinden** (siehe Layout-Tiefe „Eigenes Design-System“) — **kein** MSQDX-Orange/Near-black-Default.

1. **Header (row):** Logo | Nav-Links horizontal (3–5) | Primary-CTA rechts — \`display:flex; flex-direction:row; …\`
2. **Hero (column):** Eyebrow · H1 · Subline · **CTA-Zeile (row)** · optional Stats-row
3. **Logo-Social-Proof (row, optional)**
4. **Benefits (grid):** 3 Feature-Cards (\`grid-template-columns:repeat(3,minmax(0,1fr))\`)
5. **Editorial-Split (row, 2 Spalten)**
6. **Process/Services (row/grid, 3 Steps)**
7. **CTA-Band**
8. **Footer**

**Look:** eigene Hex-Palette + eigene \`font-family\` + eigene Spacing-Literale. **Verboten als Default:** \`#ff6a3b\`, Noto Sans, nur \`#0a0a0a\`+\`#f8f8f8\`. Kein \`var(--*)\`, kein Site-Kit-\`--site-*\`.
**Copy:** produktspezifisch — keine Seed-Labels.
Melde: „Spirion Library leer → ${EDITORIAL_LANDING_FALLBACK_LABEL}.“ Dann sofort Import mit erfundenem System.
**Nicht** nach einer einzigen leeren Search hierhin springen — zuerst Captures/Prompt-Pack.`.trim();
}
