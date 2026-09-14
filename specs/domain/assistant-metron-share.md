# Assistant ↔ METRON public share

**Status:** Accepted — 2026-09-14  
**Depends:** `assistant-metron-mcp.md` · Event Quick Check share pattern  
**Knowledge:** `knowledge/metron-mcp-assistant.md` · `knowledge/paths.md`

## Purpose

One-click **public read-only** share links for METRON dashboard snapshots shown in the Plexon assistant (after `metron_dashboard_get` / `metron_dashboard_summarize` Auto-UI) — same UX as Event Quick Check share (token → clipboard → `/share/…`).

## Snapshot

Stored JSON (`reportSnapshot`), version `1`:

| Field | Notes |
|-------|--------|
| `dashboardId` | METRON dashboard id |
| `name` | Title |
| `platformProjectId` | Optional Collection id |
| `metrics[]` | `{ label, value }` from kpi_tile / gauge |
| `chart` | `{ title, labels, values }` or null (first series) |
| `href` | Absolute METRON deep link when public URL configured |

## Auth

| Surface | Rule |
|---------|------|
| `POST /api/assistant/metron/dashboards/share` | Session required; body = snapshot |
| `GET /api/public/metron/[token]` | Public; token prefix `mtn_`; lookup by SHA-256 hash only |
| `/share/metron/[token]` | Public page (middleware allowlist) |

No anonymous writes. Revoke / expiry = later (out of scope).

## Token

`generateMetronShareToken()` → `mtn_` + 64 hex; store `hashReportShareToken(plain)` only.

## UI

After METRON Auto-UI blocks on an assistant message: **Share** copies absolute `/share/metron/{token}` (EQC clipboard pattern).

Public page (`/share/metron/:token`) is a **read-only magazine**:

| Element | Notes |
|---------|--------|
| Masthead | Title + “Read-only snapshot” chip + optional `createdAt` |
| Actions | Copy link again · Print / Save as PDF (`window.print`) |
| Body | `metric_grid` + `chart` + `link_list` via generative UI |

No login. No live filters / builder edit.

## Non-goals

Server-rendered PDF/PPTX pipelines (use browser print for v1), full EQC persona/GEO chrome, revoke/expiry.
