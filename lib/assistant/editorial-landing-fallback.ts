/**
 * Fallback structure when Spirion search returns no corpus hits.
 * Named editorial references (Linear / Verve / Superhuman) — structure only, no brand clone.
 * Used by creation_scene_edit depth + Spirion connectivity prompts.
 */
export const EDITORIAL_LANDING_FALLBACK_LABEL =
  'Best-Practice Editorial-Patterns (Linear / Verve / Superhuman)';

/** Agent-facing brief for import-html greenfield landings. */
export function buildEditorialLandingFallbackBrief(): string {
  return `
### Spirion leer → ${EDITORIAL_LANDING_FALLBACK_LABEL}
WENN \`spirion_references_search\` / \`spirion_screens_search\` **0 Treffer** liefert, DANN **nicht abbrechen** — nutze diese Struktur für \`creation_scene_import_html\` (inline CSS oder \`.class\` in \`<style>\`, **flex row** wo unten „row“ steht):

1. **Header (row):** Logo | Nav-Links horizontal (3–5) | Primary-CTA-Pill rechts — \`display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:24px\`
2. **Hero (column):** Eyebrow/Badge · H1 · Subline · **CTA-Zeile (row):** Primary-Button + Secondary-Link · **Stats (row, 3 Spalten):** Zahl+Label je Metric — jede row/grid explizit mit flex/grid + gap
3. **Logo-Social-Proof (row, optional):** 4–6 Platzhalter-Logos oder „Vertrauen von …“ — muted, flex row, gap
4. **Benefits (grid oder row):** Section-Titel · **3 Feature-Cards** nebeneinander (\`display:grid; grid-template-columns:repeat(3,1fr)\` oder flex row)
5. **Editorial-Split (row, 2 Spalten):** Textspalte (H2, Body, Link) + Visual/Placeholder — \`display:flex; flex-direction:row; gap:48px\`
6. **Process/Services (row, 3 Steps)** oder zweite Feature-Reihe — nicht alles untereinander stapeln
7. **CTA-Band (column, centered):** kurze Headline + Button
8. **Footer (row oder 2-row grid):** Link-Gruppen + Copyright

**Look (Services/B2B):** dunkler Hintergrund (#0a0a0a–#141414), helle Typo, eine Accent-Farbe (Orange o.ä.) nur für Badge/Primary-CTA — Literale in HTML, kein Fremd-Logo-Clone.
**Copy:** produktspezifisch (MSQDX Services o. Nutzerprompt) — keine Seed-Labels.
Melde dem User kurz: „Spirion Corpus leer → ${EDITORIAL_LANDING_FALLBACK_LABEL}.“ Dann sofort Import, nicht weiter suchen.`.trim();
}
