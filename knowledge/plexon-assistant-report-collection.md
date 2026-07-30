# Assistant Report-Warenkorb

Kuratierte Reports aus Assistenten-Chats: Nutzer pinnen einzelne UI-Blöcke pro Conversation, generieren einen Report mit LLM-Fazit und teilen ihn öffentlich.

## Scope

- **Conversation-scoped** — Pins und Reports gehören zu einer `assistant_conversations`-Zeile
- **Öffentlicher Share** — `/share/reports/{token}` ohne Login (Middleware-Ausnahme)
- **LLM-Narrative** — Intro, Zusammenfassung, Fazit, Empfehlungen (Anthropic)
- **Keine Zwischenschritte** — `step_list` mit `pending`/`running` ist nicht pinnbar

## Datenmodell

| Tabelle | Zweck |
|---------|--------|
| `assistant_report_pins` | Warenkorb-Einträge (`block_snapshot` JSON) |
| `assistant_shared_reports` | Generierter Report + `share_token_hash` |

Migration: `lib/db/migrations/0003_assistant_report_collection.sql` — Deploy via `npm run db:push`.

## API (Pfade in `lib/constants.ts`)

| Route | Methode | Auth |
|-------|---------|------|
| `apiAssistantConversationReportPins(id)` | GET, POST, DELETE | User, Owner |
| `apiAssistantConversationReports(id)` | GET | User, Owner |
| `apiAssistantConversationReportGenerate(id)` | POST | User, Owner |
| `apiPublicReport(token)` | GET | Öffentlich |

POST Pin: `{ messageId, blockId }` — Server validiert Block in Message-Metadata.

POST Generate: `{ title?: string }` — nutzt alle Pins der Conversation.

## UI

- Bookmark-Button auf Assistant-Blöcken (`AssistantBlockRenderer`)
- `ReportCollectionBar` unter dem Composer
- Öffentliche Seite: `app/share/reports/[token]/page.tsx`

## Code

- `lib/assistant/reports/pin-eligibility.ts` — Pin-Regeln
- `lib/assistant/reports/build-report-layout.ts` — finales `UiLayout` (alert, finding_list, recommendation_list)
- `lib/assistant/reports/generate-report-narrative.ts` — LLM (strukturierte Findings/Empfehlungen)
- `lib/assistant/reports/generate-conversation-report.ts` — Orchestrierung
- `lib/integrations/checkion-assistant-report-pdf.ts` — PDF via CHECKION-Pipeline

## PDF (CHECKION Rendering)

1. **CHECKION** (optional, wenn `PLEXON_SERVICE_SECRET` + `CHECKION_API_URL` + CHECKION deployed):  
   `POST /api/integrations/plexon/assistant-report/pdf`
2. **Fallback lokal in PLEXON** (`@react-pdf/renderer`): `lib/assistant/reports/render-assistant-report-pdf-local.tsx`
3. Download: `GET apiPublicReportPdf(token)` — liefert echtes `application/pdf`, kein JSON
4. Download: `GET apiPublicReportPptx(token)` — MSQDX-PPTX via CHECKION, Fallback lokal

Client: `ReportPdfDownloadButton` prüft `%PDF`-Magic-Bytes und zeigt Fehler statt `pdf.json`.

**Print-Block-Mapping** (PLEXON `render-ui-block-pdf.tsx`, CHECKION `PlexonAssistantReportDocument.tsx`):
`text`, `alert`, `metric_grid` (Stat-Tiles), `data_table` (echte Tabelle), `key_value_list`, `finding_list`, `recommendation_list`, `link_list`, `persona_card`, `target_group_card`, `summary_card`, `step_list`, `corner_tab_section`, `collapsible`, `chart` (Wertetabelle). Charts ohne Grafik — Daten als Tabelle.
