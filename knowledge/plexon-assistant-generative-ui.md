# PLEXON Assistant – Generative UI (Atomic Design)

Stand: Juni 2026  
Status: **Phase 0–4 + Live-Workflow + deterministische Workflow-UI** — alle Kern-Workflows mit `uiLayout`

## Ziel

Der PLEXON-Assistent soll Antworten nicht nur als Markdown liefern, sondern **live strukturierte UI** aus dem MSQDX Design System aufbauen — sicher, testbar und erweiterbar.

**Kernprinzip:** Das Modell ruft **Output-Tools** auf, die **JSON-Blöcke** erzeugen. PLEXON validiert und rendert sie über eine **Block-Registry** → echte `@msqdx/react`-Komponenten. Kein beliebiges React/HTML vom Modell.

---

## Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│ Claude (Orchestrator)                                           │
│  ├─ MCP: checkion.* / audion.*     → Daten holen                │
│  └─ Lokal: plexon_ui.*             → Darstellung steuern        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              runOrchestratorComplete (intercept plexon_ui.*)
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   UiBlockAccumulator   SSE ui_block      metadata.uiBlocks
         │                  │                  │
         └──────────────────┴──────────────────┘
                            │
              AssistantBlockRenderer (Client)
                            │
         Atomic layers → @msqdx/react (Atoms/Molecules/Audion)
```

### Trennung der Verantwortlichkeiten

| Schicht | Ort | Aufgabe |
|---------|-----|---------|
| **Tool-API** | `lib/assistant/ui-tools/` | Anthropic-Tool-Definitionen, lokale Ausführung |
| **Schema/Registry** | `lib/assistant/ui-blocks/` | Zod-Schemas, Parsing, Whitelist, Fallback-Text |
| **Server-State** | `UiBlockAccumulator` | Sammelt Blöcke pro Turn, serialisiert für DB |
| **Transport** | `assistant-sse.ts` | `ui_block`, `ui_layout`, `ui_panel` Events |
| **UI Atoms** | `components/assistant-ui/atoms/` | Kleinste Bausteine (Token-nah) |
| **UI Molecules** | `components/assistant-ui/molecules/` | Kombinationen (MetricTile, Alert, …) |
| **UI Organisms** | `components/assistant-ui/organisms/` | Agent-Blöcke (DataTable, MetricGrid, …) |
| **UI Templates** | `components/assistant-ui/templates/` | Layout-Hüllen (Stack, Section, Split) |
| **Composer** | `components/assistant-ui/` | `AssistantBlockRenderer`, `AssistantPanel` |

---

## Atomic Design – Schichten & Mapping auf MSQDX

### Atoms (`components/assistant-ui/atoms/`)

Dünne Wrapper — **nur Design-Tokens + MSQDX-Atoms**, keine Business-Logik.

| PLEXON Atom | MSQDX Basis | Agent-Props |
|-------------|-------------|-------------|
| `UiText` | `MsqdxTypography` | `variant`, `children`, `tone?` |
| `UiBadge` | `MsqdxChip` / `MsqdxBadge` | `label`, `tone: success\|warning\|error\|neutral` |
| `UiMetricValue` | `MsqdxTypography` + Token | `value`, `unit?`, `size?` |
| `UiLink` | `<a>` + Token | `href`, `label`, `external?` |
| `UiDivider` | `MsqdxDivider` | — |
| `UiIcon` | `MsqdxIcon` | `name` (whitelist) |
| `UiProgress` | `MsqdxProgress` | `value`, `max?`, `label?` |

**Regel:** Atoms kennen keine Block-IDs, keine Tool-Namen.

### Molecules (`components/assistant-ui/molecules/`)

| Molecule | Zusammensetzung | Typischer Agent-Inhalt |
|----------|-----------------|------------------------|
| `UiMetricTile` | `UiText` + `UiMetricValue` + optional `UiBadge` | PageSpeed 92, Scan-Count |
| `UiKeyValueRow` | zwei `UiText` | Label → Wert |
| `UiAlert` | `UiIcon` + `UiText` | Hinweis, Fehler, Erfolg |
| `UiTableCell` | `UiText` / `UiLink` / `UiBadge` | Tabellenzelle |
| `UiActionChip` | `UiLink` oder Button-Wrapper | „In CHECKION öffnen“ |

### Organisms (`components/assistant-ui/organisms/`)

Das sind die **Block-Typen**, die Tools direkt ansprechen.

| Block `type` | Organism | MSQDX / Legacy |
|--------------|----------|----------------|
| `text` | `UiMarkdownBlock` | `MarkdownContent` |
| `metric_grid` | `UiMetricGrid` | `MsqdxMoleculeCard` + `UiMetricTile[]` |
| `data_table` | `UiDataTable` | eigene Tabelle + `UiTableCell` |
| `key_value_list` | `UiKeyValueList` | `UiKeyValueRow[]` |
| `alert` | `UiAlertBlock` | `UiAlert` |
| `link_list` | `UiLinkList` | `UiActionChip[]` |
| `step_list` | `UiStepList` | `MsqdxStepper` (Status pro Step) |
| `summary_card` | `UiSummaryCard` | ersetzt `SummaryCard` (Migration) |
| `corner_tab_section` | `UiCornerTabSection` | `MsqdxCornerTabSection` |
| `persona_card` | `UiPersonaCard` | `MsqdxPersonaCard` (AUDION-DS) |
| `target_group_card` | `UiTargetGroupCard` | `MsqdxTargetGroupCard` |
| `chart` | `UiChartBlock` | recharts (bar/line) |
| `collapsible` | `UiCollapsibleBlock` | `MsqdxCollapsiblePanel` |

**Phase 1 MVP:** `text`, `metric_grid`, `data_table`, `alert`, `key_value_list`, `link_list`  
**Phase 2:** `step_list`, `summary_card`, `corner_tab_section`  
**Phase 3:** AUDION-spezifische Organisms + `AssistantPanel`

### Templates (`components/assistant-ui/templates/`)

| Template | Zweck |
|----------|-------|
| `UiBlockStack` | Vertikale Abfolge von Organisms (Default) |
| `UiSection` | Überschrift + Stack (optional `collapsible`) |
| `UiSplitLayout` | 2-Spalten (z. B. Metriken links, Tabelle rechts) |
| `UiPanelLayout` | Vollbreite Side-Panel-Shell |
| **`UiBlockSurface`** | **Standard-Hülle: `MsqdxCard` flat + `borderRadius="button"` (32px), Headlines mono** |

**Styling-Regel (Juni 2026):** Keine eigenen `Box`-Borders mit `--msqdx-radius-sm` (8px). Alle Block-Organisms nutzen `UiBlockSurface` oder direkt `MsqdxCard` / `MsqdxGlassCard` + `@msqdx/tokens` (Spacing, Typography, Colors).

### Composer

- **`AssistantBlockRenderer`** — `blocks: UiBlock[]` → Registry lookup → Organism
- **`AssistantMessageBlocks`** — Wrapper unterhalb der Markdown-Bubble
- **`AssistantPanel`** — optional rechts/neben Chat (Stufe 3)

---

## Datenmodell

### `UiBlock` (discriminated union)

```ts
type UiBlock = {
  id: string;           // uuid, vom Server bei append vergeben
  type: UiBlockType;    // z.B. 'metric_grid'
  props: unknown;       // typisiert per Registry
  meta?: {
    source?: 'plexon_ui';     // immer lokal
    toolCallId?: string;
    createdAt?: string;
  };
};

type UiLayout = {
  version: 1;
  blocks: UiBlock[];
  panel?: { open: boolean; title?: string; blocks: UiBlock[] };
};
```

### Message-Metadata (Erweiterung)

```ts
metadata: {
  contentType: 'markdown' | 'ui_composed' | 'capabilities_overview';
  uiLayout?: UiLayout;           // persistiert für History
  planner?: PlannerMetadata;     // bestehend
  // Legacy-Migration:
  summary?: ...                  // → uiLayout mit summary_card
  workflowSteps?: ...            // → uiLayout mit step_list
}
```

### Plain-Text-Fallback

Jeder Block-Typ implementiert `toPlainText(props): string` für:
- `message.content` (Suchbarkeit, Notifications)
- Accessibility / Screenreader-Kurzfassung

`message.content` = Markdown-Antwort des Modells **oder** aggregierter Fallback aus `uiLayout`.

---

## Output-Tools (`plexon_ui.*`)

Lokal registriert in `lib/assistant/ui-tools/definitions.ts`, **nicht** über MCP.

| Tool | Input | Verhalten |
|------|-------|-----------|
| `plexon_ui_append_block` | `{ type, props }` | Validiert, appended Block, SSE `ui_block`, Tool-Result `{ ok, blockId }` |
| `plexon_ui_update_block` | `{ id, props }` | Merge/replace props (z. B. Step-Status live) |
| `plexon_ui_clear_blocks` | `{ scope?: 'message' \| 'panel' }` | Leert Akkumulator |
| `plexon_ui_set_panel` | `{ open, title?, blocks? }` | Side-Panel (Phase 3) |
| `plexon_ui_render_text` | `{ markdown }` | Optional: ersetzt Freitext-Stream für rein strukturierte Antworten |

**Tool-Result an Claude:** kurz (`{ ok: true, blockId: "…" }`) — **keine** vollen Props zurück (Token-Budget).

### Orchestrator-Integration

In `orchestrator-complete.ts`:

1. `plexonUiTools` zu `tools[]` mergen (immer, unabhängig von MCP-Entitlements).
2. Bei `tool_use.name.startsWith('plexon_ui_')`:
   - **nicht** an MCP senden
   - `executePlexonUiTool(name, input, accumulator)` aufrufen
   - `onUiBlock?.(block)` für SSE
3. `toolsFilter` aus Planner: neue Familie `plexon_ui` standardmäßig **immer erlaubt** bei `mode: tools`.

Neue Datei: `lib/assistant/ui-tools/executor.ts`

---

## SSE-Erweiterung

`lib/assistant/assistant-sse.ts`:

```ts
| { type: 'ui_block'; block: UiBlock; index: number }
| { type: 'ui_block_update'; id: string; props: unknown }
| { type: 'ui_panel'; open: boolean; title?: string }
| { type: 'ui_reset' }   // neuer Turn
```

Client (`assistant-stream-client.ts`, `AssistantChat.tsx`):
- `liveUiBlocks: UiBlock[]` State parallel zu Streaming-Text
- Bei `ui_block`: append + scroll
- Bei `done`: `metadata.uiLayout` aus Server übernehmen

---

## System-Prompt & Planner

### System-Prompt (`lib/assistant/system-prompt.ts`)

Neuer Abschnitt **„UI-Ausgabe (plexon_ui)“**:

- Daten via MCP/REST holen, Darstellung via `plexon_ui_append_block`
- Nie HTML/JSX im Freitext erfinden
- Tabellen > 5 Zeilen → `data_table`, nicht Markdown-Tabelle
- Metriken → `metric_grid`
- Links zu CHECKION/AUDION → `link_list` mit zentralen URL-Buildern (`lib/paths/`)
- Max. N Blöcke pro Antwort (z. B. 12)

### Tool-Katalog (`lib/assistant/tool-catalog.ts`)

```ts
| 'plexon_ui'  // patterns: /^plexon_ui_/
```

### Planner (`assistant-planner.ts`)

- Intent `project_status`, `checkion_scan`, `audion_persona` → `toolFamilies` inkl. `plexon_ui`
- `maxToolRounds` unverändert; UI-Tools zählen nicht gegen MCP-Budget (eigener Zähler optional)

### UI-Tool-Schema für Claude

`lib/assistant/ui-tools/tool-schemas.ts` — pro Block-Typ **kompaktes** JSON-Schema (nur erlaubte Props, Enums für `tone`, max array lengths).

Separat: `lib/assistant/ui-tools/catalog-for-prompt.ts` — menschenlesbare Block-Katalog-Liste für System-Prompt (welcher Block wann).

---

## Sicherheit & Validierung

| Risiko | Maßnahme |
|--------|----------|
| XSS via Props | Zod: nur strings, max length; Links via `safeExternalUrl()` |
| Unbekannter Block-Typ | Registry reject → Tool-Error an Claude |
| Zu große Layouts | Max 12 Blöcke, max 50 Tabellenzeilen, max 8 Metriken |
| eval/React vom Modell | **Verboten** — nur Whitelist-Organisms |
| HTML in markdown | `MarkdownContent` (bestehend) — kein raw `dangerouslySetInnerHTML` in UI-Blocks |

`lib/assistant/ui-blocks/validate.ts` — zentrale `parseUiBlock(type, props)`.

---

## Migration bestehender UI

| Alt | Neu |
|-----|-----|
| `SummaryCard` + `metadata.summary` | `uiLayout` mit `summary_card` |
| Legacy `workflowSteps` metadata | `step_list` Block (via `resolveMessageUiLayout`) |
| `ConfirmActionCard` | bleibt (interaktiv) — **kein** generatives UI |
| `PlannerStepCard` | bleibt (Debug/Transparenz) |
| `capabilities_overview` | bleibt statisch ODER später `corner_tab_section` |

`AssistantMessageList` rendert:
1. Markdown-Bubble (wie bisher)
2. `AssistantMessageBlocks` wenn `uiLayout.blocks.length > 0`
3. Legacy-Fallback wenn nur alte Metadata

---

## Dateistruktur (neu)

```
lib/assistant/
  ui-blocks/
    types.ts                 # UiBlock, UiLayout, UiBlockType
    registry.ts              # type → { schema, toPlainText }
    blocks/
      metric-grid.schema.ts
      data-table.schema.ts
      alert.schema.ts
      ...
    validate.ts
    to-plain-text.ts
  ui-tools/
    definitions.ts           # Anthropic tool defs
    executor.ts
    accumulator.ts
    catalog-for-prompt.ts
    tool-schemas.ts

components/assistant-ui/
  atoms/
    UiText.tsx
    UiBadge.tsx
    ...
  molecules/
    UiMetricTile.tsx
    UiAlert.tsx
    ...
  organisms/
    UiMetricGrid.tsx
    UiDataTable.tsx
    ...
  templates/
    UiBlockStack.tsx
    UiSection.tsx
  AssistantBlockRenderer.tsx
  AssistantMessageBlocks.tsx
  AssistantPanel.tsx           # Phase 3
  index.ts

__tests__/
  ui-blocks-validate.test.ts
  ui-tools-executor.test.ts
  assistant-ui-sse.test.ts
  assistant-block-renderer.test.tsx
```

**Pfade/URLs:** weiterhin nur `lib/constants.ts`, `lib/paths/*` — keine hardcodierten Links in Block-Props vom Modell ohne Validierung.

---

## Implementierungsphasen

### Phase 0 – Fundament (½–1 Tag)

- [ ] `ui-blocks/types.ts`, `registry.ts`, Zod für 3 Block-Typen (`alert`, `metric_grid`, `key_value_list`)
- [ ] `UiBlockAccumulator`
- [ ] Atoms: `UiText`, `UiBadge`, `UiMetricValue`
- [ ] Molecules: `UiMetricTile`, `UiAlert`
- [ ] Organisms: `UiMetricGrid`, `UiAlertBlock`, `UiKeyValueList`
- [ ] `AssistantBlockRenderer` + Tests

**Done wenn:** Renderer rendert statisches `UiLayout` aus JSON in Storybook-artigem Unit-Test.

### Phase 1 – Tools + Orchestrator (1–2 Tage)

- [ ] `plexon_ui_append_block`, `plexon_ui_clear_blocks`
- [ ] Orchestrator-Intercept (lokal, nicht MCP)
- [ ] `onUiBlock` Callback durch `assistant-agent` → `complete-handler`
- [ ] SSE `ui_block` / `ui_reset`
- [ ] Client: live blocks in `AssistantChat`
- [ ] Persistenz: `metadata.uiLayout` in `createAssistantMessage`
- [ ] System-Prompt + Tool-Katalog `plexon_ui`
- [ ] Tests: executor, SSE encode, integration mock orchestrator

**Done wenn:** „Zeig PageSpeed als Karten“ baut live `metric_grid` während der Antwort.

### Phase 2 – Tabellen & Rich Blocks (1–2 Tage)

- [ ] `data_table`, `link_list`, `text` Blocks
- [ ] `UiDataTable`, `UiLinkList`, `UiMarkdownBlock`
- [ ] `plexon_ui_update_block` (für laufende Workflows)
- [ ] Migration `SummaryCard` → `summary_card` Organism
- [ ] `step_list` + Workflow-Integration
- [ ] Plain-text Fallback Generator

**Done wenn:** Scan-Ergebnisse als Tabelle + Link-Liste statt Markdown-Wand.

### Phase 3 – Panel & AUDION-DS (2–3 Tage)

- [ ] `AssistantPanel` (Split-View im Assistant-Layout)
- [ ] `plexon_ui_set_panel`
- [x] `corner_tab_section`, `persona_card`, `target_group_card`
- [x] Planner heuristisch: große Daten → Panel (`buildUiPanelHintForPlan`)
- [x] i18n für UI-Chrome (Panel-Titel, SummaryCard, locales de/en)

**Done wenn:** Persona-Übersicht öffnet Panel mit Corner-Tab-Layout.

### Phase 4 – Charts, Links, Polish (PLEXON)

- [x] `chart` Block (bar/line, recharts) + Zod + Renderer
- [x] Zentrale Produkt-URLs `lib/assistant/ui-blocks/product-links.ts`
- [x] `SummaryCard` → `UiSummaryCard` mit i18n
- [x] `to-plain-text` für alle Block-Typen inkl. `chart`
- [x] Tool-Katalog + Panel-Hint im System-Prompt
- [x] Tests `assistant-ui-phase4.test.ts`

**Offen (optional):** DS-Upstream `MsqdxMetricGrid` / `MsqdxDataTable`.

- [x] Live-Workflow → `step_list` per Workflow-SSE (`ui_block_update` + Message-Persistenz)

### Phase 5 – Design System Upstream (optional, parallel)

Wiederverwendbare Organisms nach `@msqdx/react` extrahieren:
- `MsqdxMetricGrid`, `MsqdxDataTable` (generisch, nicht PLEXON-spezifisch)
- PLEXON `assistant-ui` importiert dann aus DS

**Kriterium:** Organism ist in ≥2 Produkten sinnvoll (PLEXON Assistant, AUDION Dashboard, …).

---

## Teststrategie

| Ebene | Was |
|-------|-----|
| **Schema** | Jedes `*.schema.ts`: valid/invalid fixtures |
| **Executor** | Tool calls → accumulator state + SSE payloads |
| **Renderer** | React Testing Library: Block-Typen rendern ohne crash |
| **Orchestrator** | Mock Anthropic: `plexon_ui_*` wird lokal ausgeführt, MCP nicht aufgerufen |
| **SSE** | `encodeAssistantSseEvent` für `ui_block` |
| **E2E-light** | `complete-handler` mit gemocktem Agent → `metadata.uiLayout` gespeichert |
| **Security** | Props mit `<script>`, `javascript:` URLs → rejected |

`npm test` muss nach jeder Phase grün bleiben; keine Regression bei bestehenden Assistant-Tests.

---

## Abhängigkeiten

- **Bestehend:** `@msqdx/react`, `@msqdx/tokens`, Zod (falls nicht vorhanden: hinzufügen)
- **Kein** neues Runtime-`eval`, kein `react-live`
- Optional Phase 5: DS-Package-Version bump in PLEXON `package.json`

---

## Nicht-Ziele (v1)

- Beliebiges JSX/HTML vom Modell
- User-editierbare UI-Blöcke (WYSIWYG) im Chat
- Board-Prismion-Integration (separates Konzept)

---

## Erfolgskriterien

1. Assistent baut bei Daten-Antworten **sichtbar MSQDX-UI** (Metriken, Tabellen, Alerts).
2. UI erscheint **live während** des Streams (nicht nur nach `done`).
3. Chat-History zeigt gespeicherte Blöcke identisch zum Live-Stream.
4. Alle Block-Typen schema-validiert; unbekannte Typen failen gracefully.
5. Atomic-Layers: neue Block-Typen = neues Schema + Organism, Atoms/Molecules wiederverwenden.

---

## Deterministische Workflow-UI (Phase 2 Playbooks)

Neben `plexon_ui.*` (Agent) bauen **Intent-Workflows** und **Playbooks** feste `uiLayout`-Layouts in `lib/assistant/ui-blocks/build-*-ui.ts`. Kein LLM für die Struktur — nur Daten aus REST-Clients.

### Website-Audit Report (`build-playbook-report-ui.ts`)

| Block | Inhalt |
|-------|--------|
| `text` | Intro: Playbook-Label, URL, optional Gesamt-Score |
| `metric_grid` | Performance, PSI-A11y, Scan, GEO, SSL, Headers |
| `chart` | Balken-Vergleich der Scores |
| `data_table` | Schritt-Status + Kurzdetail pro Outcome |
| `link_list` | CHECKION Scan + Basis-URL |
| `alert` | Warnung bei fehlgeschlagenen optionalen Schritten |

**Trigger:** Intent `run_playbook` / `website_audit` → `handlers/run-playbook.ts` → `runPlaybook()`.

### Launch Readiness Report (`build-launch-readiness-ui.ts`)

| Block | Inhalt |
|-------|--------|
| `text` | Projektname, URL, Plattform-Projekt-ID |
| `metric_grid` | **Launch-Ampel** — `tone`: `success` / `warning` / `error` je Score/Probe |
| `data_table` | Onboarding-Schritte (Create, Sync, Research, Audit, Persona, Summary) |
| `collapsible` | Projekt-Zusammenfassung (Markdown) |
| `link_list` | PLEXON Dashboard |
| `alert` | Teilerfolg / Fehler-Hinweis |

**Trigger:** Intent `run_playbook` / `launch_readiness` → `runLaunchReadiness()`.

### Domain Deep Scan (`build-domain-scan-ui.ts`)

| Block | Inhalt |
|-------|--------|
| `text` | Domain + Seitenanzahl |
| `metric_grid` | Score, Seiten, Fehler/Warnungen mit `tone` |
| `data_table` | Top-Issues |
| `link_list` | CHECKION Deep-Scan-URL (`pathCheckionDomainScan`) |

### GEO / E-E-A-T (`build-geo-ui.ts`)

| Block | Inhalt |
|-------|--------|
| `metric_grid` | Gesamt-GEO-Score |
| `data_table` | Wettbewerber |
| `chart` | Score-Vergleich Wettbewerber |
| `text` | Keywords (Markdown-Liste) |

### Rezept für neue Playbook-Reports

1. Outcomes in `PlaybookRunResult` / eigener Result-Typ sammeln.
2. UI-Builder in `lib/assistant/ui-blocks/build-*-ui.ts` — nur `createUiBlock()` + Registry-Typen.
3. Handler setzt `metadata.contentType: ui_composed` + `uiLayout`.
4. Smoke in `__tests__/e2e-assistant-smoke.test.ts`.

---

## Referenzen im Repo

| Thema | Datei |
|-------|-------|
| Orchestrator / Tool-Loop | `lib/assistant/orchestrator-complete.ts` |
| SSE | `lib/assistant/assistant-sse.ts` |
| Message Metadata | `components/assistant/AssistantMessageList.tsx` |
| Bestehende Cards | `components/assistant/SummaryCard.tsx`, … |
| MSQDX Atomic Export | `msqdx-design-system/packages/react/src/components/` |
| Assistant Architektur | `knowledge/plexon-assistant-orchestrator.md` |
| Phase-2 Playbooks (Plan) | `knowledge/plexon-assistant-phase2-playbooks.md` |
