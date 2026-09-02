# Collection Flow — Report Pins (Warenkorb)

**Status:** Accepted — Wave 26 — 2026-09-02  
**Companions:** `knowledge/plexon-assistant-report-collection.md`, `specs/domain/collection-test-flow.md` (Wave 25), `specs/domain/collection-memory-wave1.md`

## Goal

Nach einem Collection-Test-Flow-Lauf kuratierte **Prozess-Ausgaben pinnen** und denselben **Share-Report** erzeugen wie im Assistant-Chat — für Showcase und Stakeholder-Links.

## UX

1. Run-Dock **Prozess-Ausgaben**: Pin / Unpin pro Zeile (wie `ReportPinButton`).
2. **Report-Warenkorb** unter dem Dock (Zähler + Dialog + „Report erstellen“).
3. Generate → öffentlicher Share `/share/reports/{token}` (+ PDF/PPTX wie Chat).
4. Best-effort Knowledge Pack Section `flow-report-latest`.

## Pinnable

- Nodes with non-empty output text from rehydrated `runOutputs` / dossier items.
- Snapshot: `{ nodeId, kind, label, text, imageUrl?, historyRunId? }`.
- **Not** pinnable: empty outputs, config-only nodes without text.

## Data

| Table | Purpose |
|-------|---------|
| `collection_flow_report_pins` | Cart: unique `(flowId, userId, nodeId, historyRunId)` + `output_snapshot` JSON |
| `assistant_shared_reports` | Reused; conversation FK via get-or-create flow-scoped Assistant conversation |

Pins are **user + flow** scoped (optional `historyRunId` for run isolation). Generate converts snapshots → `UiBlock` `text` → existing `generateConversationReport` / narrative LLM.

## API

| Route | Methods |
|-------|---------|
| `…/flows/{flowId}/report-pins` | GET, POST, DELETE |
| `…/flows/{flowId}/reports/generate` | POST |

POST pin: `{ nodeId, label, kind, text, imageUrl?, historyRunId? }`  
POST generate: `{ title?, pinIds?, publishToCollection? }`

## Acceptance

- **MUSS** pin/unpin persist across reload for the same user+flow.
- **MUSS** generate produce a public share URL when ≥1 pin selected.
- **MUSS** reuse Assistant report layout/narrative/PDF paths (no second report engine).
- **SOLLTE** publish `flow-report-latest` into Collection KP when not opted out.

## Tests

- Snapshot → UiBlock mapping
- Pin uniqueness / truncate text
- Generate orchestration with fixture pins (mock narrative optional)
