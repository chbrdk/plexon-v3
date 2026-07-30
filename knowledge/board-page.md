# Board Page (Prompt-Eingabe)

## Route

- **Path:** `PATH_BOARD` = `/board` (siehe `lib/constants.ts`)
- **Datei:** `app/board/page.tsx`

## Funktionalität

- Zeigt ein **Board** mit dem **React Flow**-basierten Canvas (**`ReactFlowBoard`** in `components/board/ReactFlowBoard.tsx`). Nodes = Cards, Edges = Connections; Zoom/Pan, Verbindungen und Kanten-Routing über [@xyflow/react](https://reactflow.dev/).
- **Auswahl-Panel:** Wenn eine Card selektiert ist, erscheint rechts ein Panel mit Titel, bei Prompt-Cards mit Prompt-Feld und Submit; darunter die Results für diese Card.
- **Eine zentrale Prismion-Card** dient zur Prompt-Eingabe:
  - Position wird so gewählt, dass die Card bei initialem Pan **mittig** im Viewport erscheint (per `ResizeObserver` und `initialPan`).
  - Card ist **draggable**; Position wird über `onPrismionMove` aktualisiert.
  - Submit über `onPrismionPromptSubmit`: ruft **Claude Haiku 4.5** über `POST /api/board/complete` auf und fügt eine **neue Result-Card** rechts neben der Quell-Card ein (mit `prismionResults` und `PrismionResultItem` Text).
- **Höhe nach Inhalt:** Cards haben keine feste Höhe; sie wachsen mit dem Inhalt. Die tatsächliche Größe wird per `ResizeObserver` in `MsqdxPrismionCard` gemessen und über `onResize` gemeldet. Die Board-Page aktualisiert `prismion.size` via `onPrismionResize`, sodass Port- und Connector-Positionen weiterhin korrekt berechnet werden.
- **Kein Page-Header:** Titel und Untertitel („Board“, „Prompt eingeben…“) sind entfernt; die Seite zeigt nur das Canvas.
- **localStorage-Persistenz:** Board-State (Haupt-Prompt-Card, weitere Prompt-Cards, Result-Cards, Connections, `prismionResults`) wird unter **`BOARD_STORAGE_KEY`** (`plexon_board_state`) gespeichert und beim nächsten Besuch wiederhergestellt.
- **Kollisionsfreie Platzierung:** Neue Result-Cards (nach Submit) und neue Prompt-Cards (aus dem Port-Menü) werden über `findNonOverlappingPosition` (lib/board-collision.ts) so platziert, dass sie nicht mit bestehenden Cards überlappen; bei Kollision wird vertikal (dann ggf. in neuer Spalte) ausgewichen. Neue Cards erhalten einen erhöhten `zIndex`, damit sie über bestehenden liegen und greifbar bleiben.
- **Connector-Linien:** Die Verbindungslinien nutzen die **gespeicherten Ports** der Connection (`fromPort`/`toPort`); die Linie startet und endet mittig am gewählten Port. Fallback auf optimale Port-Wahl (Design-System) nur wenn Ports fehlen.
- **React Flow Canvas:** Smoothstep-Kanten, Handles an allen vier Seiten (top/right/bottom/left). Move/Delete/Select werden an die Page gemeldet; State bleibt in PLEXON (localStorage). Delete/Backspace löscht selektierte Cards. Doppelklick auf leere Fläche erstellt eine neue Prompt-Card; Verbindungen durch Ziehen von Handle zu Handle.
- **WYSIWYG-Editor für Result-Cards:** Doppelklick auf den Kartentext einer Result-Card öffnet einen Inline-Editor in der Card (contenteditable + Toolbar: Fett, Kursiv, Unterstrichen). Beim Verlassen (Blur) wird der Inhalt als HTML gespeichert (`PrismionResultItem` type `richtext`); Anzeige nutzt `DOMPurify` (isomorphic-dompurify) zur Sanitization. Handler: `onResultContentChange` in `ReactFlowBoard`, `handleResultContentChange` in der Board-Page; Persistenz über `prismionResults` und localStorage.
- **Build:** Für Next.js-Build muss **`DS_BASE`** auf den Design-System-Pfad zeigen (z. B. `DS_BASE="../MSQDX-DS/msqdx-design-system"`). Board nutzt **`@xyflow/react`** (React Flow) direkt in PLEXON.

## Nesting-Struktur (Prompt-/Result-Cards)

Die logische Hierarchie der Cards ist:

- **Initial:** `(promptcard)` – nur die zentrale Prompt-Card.
- **Nach erstem Ergebnis:** `(promptcard (resultcard)+(weitere promptcard))` – die Prompt-Card „enthält“ die Result-Card und die weitere Prompt-Card als Geschwister (beide sind Kinder derselben Prompt-Card).
- **Bei Eingabe in der weiteren Prompt-Card:** `(promptcard (resultcard)+(weitere promptcard (resultcard)+(weitere promptcard)))` – die weitere Prompt-Card kann selbst wieder (Result + weitere Prompt) enthalten, usw.

Technisch (eigene Lösung mit explizitem Parent):
- **`parentByPrismionId`** (Record<childId, parentId>) ist die einzige Quelle für Nesting. Wird in `BoardPersistedState` und localStorage gespeichert.
- Beim **Submit** wird eine Connection **Quell-Prompt → Result** angelegt und **`parentByPrismionId[resultId] = promptId`** gesetzt.
- Beim **„Prompt unter Result hinzufügen“** wird nur **eine** Connection **result → neue Prompt** angelegt (für History/Upstream) und **`parentByPrismionId[newPromptId] = parentPromptId`** (die Prompt, die die Result-Card erzeugt hat).
- **`getChildrenInOrder(rootId, parentByPrismionId, prismions)`** (lib/board-thread.ts) liefert die direkten Kinder einer Prompt-Card in der Reihenfolge (Result-Cards)+(weitere Prompt-Cards).
- **`getThreadRootIdFromParent(cardId, parentByPrismionId)`** liefert die Root-Prompt durch Ablauf der Parent-Kette.
- **Migration:** Beim Laden fehlt `parentByPrismionId`, wird aus Connections abgeleitet; alte `conn-parent-*`-Connections werden entfernt.

## API

- **`API_BOARD_COMPLETE`** = `/api/board/complete` (POST, Body: `{ prompt: string }`, Response: `{ text: string }`).
- **Claude-Modell:** Standard **Claude Sonnet 4** (`claude-sonnet-4-20250514`) für bessere Tool-/MCP-Nutzung; Override per **`ANTHROPIC_BOARD_MODEL`** (z. B. `claude-haiku-4-5-20251001` für Haiku). Erfordert **`ANTHROPIC_API_KEY`** (siehe `.env.example`).

## Konstanten

- `PROMPT_CARD_W = 360`, `PROMPT_CARD_H = 220` (Prompt-Card).
- `RESULT_CARD_W = 380`, `RESULT_CARD_H = 280`, `CARD_GAP = 24` (neue Result-Cards).
- **`BOARD_STORAGE_KEY`** = `'plexon_board_state'` in `lib/constants.ts` – localStorage-Key für den Board-State.

## i18n

- `board.title`, `board.subtitle`, `board.promptCardTitle`, `board.promptPlaceholder`, `board.promptSubmitted` in `locales/de.json` und `locales/en.json`.
