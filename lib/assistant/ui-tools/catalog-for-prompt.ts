/** Compact UI block catalog for the assistant system prompt. */

export function buildUiToolsPromptBlock(): string {
  return `## UI-Ausgabe (plexon_ui – MSQDX Design System)

Nutze **plexon_ui_append_block** für strukturierte Darstellung. Daten zuerst per MCP/REST holen, dann Blöcke bauen.
- Kein HTML/JSX im Freitext erfinden.
- Keine Emojis/Emoticons in Block-Props (Priorität als Text, z. B. „Mittel“, nicht „⚡ Mittel“).
- Tabellen > 3 Zeilen → \`data_table\`, nicht Markdown-Tabelle.
- Metriken/Scores → \`metric_grid\`.
- Personas → \`persona_card\`; Zielgruppen → \`target_group_card\`.
- Große Übersichten (viele Personas/Karten) → **plexon_ui_set_panel** mit \`open: true\`.
- Status-Updates → \`plexon_ui_update_block\` mit derselben block-id.
- Links: https-URLs oder interne Pfade ab \`/\`.

### Tools
| Tool | Zweck |
|------|--------|
| \`plexon_ui_append_block\` | Block zur Chat-Nachricht |
| \`plexon_ui_update_block\` | Block per id ersetzen (z. B. step_list) |
| \`plexon_ui_set_panel\` | Side-Panel öffnen/schließen |
| \`plexon_ui_clear_blocks\` | scope: message \\| panel \\| all |

### Block-Typen
| type | props |
|------|--------|
| \`metric_grid\` | \`title?\`, \`items: [{ label, value, unit?, tone?, hint? }]\` |
| \`data_table\` | \`title?\`, \`columns\`, \`rows\` |
| \`key_value_list\` | \`title?\`, \`items: [{ label, value }]\` |
| \`color_swatch_grid\` | \`title?\`, \`guidelineName?\`, \`items: [{ label, hex, path? }]\` — Brandion Farben (Auto nach brandion_tokens_list) |
| \`font_specimen_list\` | \`title?\`, \`items: [{ label, family, weight?, sample?, path? }]\` — Brandion Schriften |
| \`alert\` | \`title?\`, \`message\`, \`tone?\` |
| \`link_list\` | \`title?\`, \`links: [{ label, href, external? }]\` |
| \`text\` | \`markdown\` |
| \`persona_card\` | \`title?\`, \`personas: [{ id, name, segment, confidence, headline, imageUrl?, actionHref? }]\` |
| \`target_group_card\` | \`title?\`, \`targetGroups: [{ id, name, segment, personaCount, knowledgeEntryCount, ... }]\` |
| \`summary_card\` | \`title\`, \`checkionScanCount?\`, \`audionPersonaCount?\`, \`links?\` |
| \`step_list\` | \`title?\`, \`steps: [{ id, label, status, detail?, progress? }]\` |
| \`phase_strip\` | \`title?\`, \`phases: [{ id, label, summary?, active?, status?, moments?: [{ kind, label }] }]\` — moments enable client phase switching |
| \`moment_list\` | \`title?\`, \`items: [{ id?, kind: action\\|thought\\|feeling\\|pain\\|opportunity\\|other, label }]\` |
| \`quote_list\` | \`title?\`, \`items: [{ quote, attribution?, context?, tone? }]\` |
| \`corner_tab_section\` | \`tabLabel\`, \`title?\`, \`markdown\`, \`placement?\` |
| \`chart\` | \`chartType: bar\\|line\`, \`labels[]\`, \`datasets: [{ label, values[] }]\`, \`xAxisLabel?\`, \`yAxisLabel?\` |

\`tone\` / step \`status\`: pending, running, done, error (+ success, warning, info für tone).

**Panel:** Bei ≥4 Personas/Karten oder Tabellen >8 Zeilen → \`plexon_ui_set_panel\` mit \`open: true\`. Produkt-Links über https oder interne Pfade (\`lib/paths\`).

**Showcase:** Wenn der Nutzer alle UI-Blöcke/Komponenten sehen will → **jeden** Block-Typ mindestens einmal per \`plexon_ui_append_block\` (nicht nur alert + metric_grid).

### Block-Rezepte (deterministische Workflows / Agent)
| Situation | Blöcke |
|-----------|--------|
| Projekt nur in AUDION/CHECKION | \`key_value_list\` + \`link_list\` (kein PLEXON-Dashboard) |
| Plattform-Projekt + Sync | \`step_list\` + \`summary_card\` + \`key_value_list\` (Sync) |
| Accessibility-Scan | \`metric_grid\` + \`data_table\` + \`link_list\` |
| PageSpeed | \`metric_grid\` + \`chart\` (bar) |
| GEO/E-E-A-T | \`metric_grid\` + \`data_table\` + \`chart\` |
| Persona-Bootstrap | \`target_group_card\` + \`persona_card\` |
| Journey outline (AUDION) | \`phase_strip\` + \`moment_list\` (+ \`link_list\` deep link) |
| Journey validate (AUDION) | \`quote_list\` + \`finding_list\` + \`recommendation_list\` |
| Sync-Diagnose | \`key_value_list\` + \`alert\` |
| Brandion Farben/Fonts | MCP \`brandion_tokens_list\` → Auto \`color_swatch_grid\` / \`font_specimen_list\` (keine zweite volle Palette per append_block) |`;
}

export function buildUiPanelHintForPlan(intent: string): string {
  if (
    intent === 'audion_persona' ||
    intent === 'audion_knowledge' ||
    intent === 'audion_journey' ||
    intent === 'audion_documents' ||
    intent === 'checkion_scan' ||
    intent === 'checkion_seo_geo' ||
    intent === 'checkion_journey' ||
    intent === 'brandion_brand' ||
    intent === 'project_status'
  ) {
    return 'UI-Hinweis: Umfangreiche Ergebnisse (≥4 Personas/Karten oder Tabellen >8 Zeilen) im Side-Panel mit `plexon_ui_set_panel` darstellen. Bei Brandion-Farben/Fonts: nach `brandion_tokens_list` erscheinen Auto-Blöcke `color_swatch_grid` / `font_specimen_list` — Kurztext dazu, keine zweite volle Palette per append_block.';
  }
  return '';
}
