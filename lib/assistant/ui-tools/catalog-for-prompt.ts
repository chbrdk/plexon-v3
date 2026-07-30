/** Compact UI block catalog for the assistant system prompt. */

export function buildUiToolsPromptBlock(): string {
  return `## UI-Ausgabe (plexon_ui – MSQDX Design System)

Nutze **plexon_ui_append_block** für strukturierte Darstellung. Daten zuerst per MCP/REST holen, dann Blöcke bauen.
- Kein HTML/JSX im Freitext erfinden.
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
| \`alert\` | \`title?\`, \`message\`, \`tone?\` |
| \`link_list\` | \`title?\`, \`links: [{ label, href, external? }]\` |
| \`text\` | \`markdown\` |
| \`persona_card\` | \`title?\`, \`personas: [{ id, name, segment, confidence, headline, imageUrl?, actionHref? }]\` |
| \`target_group_card\` | \`title?\`, \`targetGroups: [{ id, name, segment, personaCount, knowledgeEntryCount, ... }]\` |
| \`summary_card\` | \`title\`, \`checkionScanCount?\`, \`audionPersonaCount?\`, \`links?\` |
| \`step_list\` | \`title?\`, \`steps: [{ id, label, status, detail?, progress? }]\` |
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
| Sync-Diagnose | \`key_value_list\` + \`alert\` |`;
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
    intent === 'project_status'
  ) {
    return 'UI-Hinweis: Umfangreiche Ergebnisse (≥4 Personas/Karten oder Tabellen >8 Zeilen) im Side-Panel mit `plexon_ui_set_panel` darstellen.';
  }
  return '';
}
