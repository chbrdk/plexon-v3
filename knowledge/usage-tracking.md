# PLEXON – Usage-Tracking (Tokens als Währung)

CHECKION, AUDION, VIDEON und **BRANDION** senden Nutzungs-Events an PLEXON. PLEXON rechnet sie in Tokens um, speichert sie und zeigt sie im Dashboard.

## Backend

- **Tabellen:** `usage_events` (Detail-Events), `usage_aggregated` (pro User/Service/Periode, z. B. Monat).
- **API:** `POST /api/services/usage/events` – Auth per `X-Service-Secret`. Body: `user_id`, `service` (checkion | audion | videon | brandion | metron | echon), `event_type`, `raw_units`, optional `idempotency_key`.
- **Konvertierung:** `lib/usage-conversion.ts` – z. B. `llm_request` → input_tokens + 2×output_tokens (auch `prompt_tokens`/`completion_tokens`); `scan_wcag` → 50×scans; `scan_pagespeed` → 20; CHECKION **`domain_scan_page`** → 50×pages (pro abgeschlossener Deep-Scan-Seite, `raw_units` mit `domain_scan_id`, `page_index`, `ok`, `url`); bei **`reused_unchanged: true`** (unveränderte Seite per HEAD/Reuse) → **5×pages**; `page_classify` (Legacy) → 40×pages oder max(40×pages, input+2×output) wenn Token-Felder gesetzt; `domain_scan` (Sammel) → 50×pages; `ux_check` / `serp_refresh`; CHECKION-Tools `tool_extract` (28), `wayback_lookup` (6), `ssl_labs_analyze` (18) pro Request; CHECKION Market SEO **`seo_dataforseo`** → `cost_usd × 100_000` (Vendor-USD ≈ Plexon-Einheiten); generisches **`vendor_cost`** (OpenRouter/Jev USD) → gleiche `cost_usd × 100_000`-Anker; Assistant **`workflow_run`** → dokumentierte Floors (scan/domain 120, geo 100, persona/journey 80, sonst 50) als **Orchestrations-Floor** — Produkt-Apps billet den echten Downstream-Spend separat (kein Ersatz dafür); unbekannte Event-Typen → **0**; VIDEON **`transcription`** → 80×minutes; **`video_generation`** → 800×runs; AUDION `journey_validate` → 35×personas; `persona_discover` → 75×runs; `retrieval_query` / `journey_agent` → 18×queries / 100 floor; **BRANDION** `brandion_detect` → PDF **40×pages** / Image **25×runs**; `brandion_measure` → **30×runs**; plus optional `llm_request` wenn Vision.
- **Dashboard-Verlauf:** `GET /api/usage` liefert bei jedem Event optional `rawUnits`; die Spalte **Details** nutzt `lib/usage-event-detail.ts` (u. a. lesbare Zeile für `domain_scan_page`).
- **Abruf:** `GET /api/usage` (Session) = Nutzung des eingeloggten Users (inkl. `summary`, `recentEvents`, `byDay` für Verlauf und Diagramm); `GET /api/admin/usage` = Übersicht aller User (für Admin).

### Admin: globale Event-Liste

- **`GET /api/admin/usage/events`** (nur Rolle **admin**, Session oder Bearer wie andere Admin-Routen): liefert `{ events: [...] }` aus `usage_events`, **join** auf `users` für `userEmail`.
- **Query-Parameter:** `limit` (Default 100, max 500), `offset` (Default 0, max 1 000 000), optional `userId`, `service` (`checkion` \| `audion` \| `videon` \| `brandion`), `eventType` (exakter String).
- **Response pro Event:** `id`, `userId`, `userEmail` (nullable), `service`, `eventType`, `rawUnits`, `tokens`, `createdAt` (ISO).
- **Konstante:** `API_ADMIN_USAGE_EVENTS` in `lib/constants.ts`.
- **Performance:** Bei vielen Zeilen empfiehlt sich ein Index z. B. `CREATE INDEX IF NOT EXISTS usage_events_created_at_idx ON usage_events (created_at DESC);` (optional, nicht im Repo-Pflicht).

## Dashboard

- Auf der Startseite (Dashboard) erscheint eine Sektion **Nutzung** mit:
  - Tabelle: Dienst, Periode (YYYY-MM), Tokens (bei Admin: inkl. Nutzer-Spalte).
  - **Admin:** Abschnitt **Alle Nutzer – letzte Events** (`GET /api/admin/usage/events`, erste 100 Zeilen, **Mehr laden** mit `offset`); Spalten inkl. Details aus `formatUsageEventDetail` (wie im eigenen Verlauf).
  - **Verlauf:** Letzte Nutzungen des **eingeloggten** Users (Zeit, Dienst, Aktion, Details, Tokens) aus `GET /api/usage` → `recentEvents`.
  - **Diagramm:** Verbrauch nach Tag (30 Tage, mit Null-Tagen aufgefüllt), Monat (12 Monate) oder Jahr; Magazine-Balkendiagramm (`UsageTokenChart`, Recharts).
- Datenquelle: `GET /api/usage` (session-basiert); bei Admin zusätzlich `GET /api/admin/usage` und `GET /api/admin/usage/events`.

## Env (Services)

- **CHECKION / AUDION:** Bereits für Auth nötig: `PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`. Dieselben Werte werden für Usage-Reporting verwendet; keine zusätzlichen Variablen.
