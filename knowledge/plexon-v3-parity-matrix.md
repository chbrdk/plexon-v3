# Plexon v3 — Parity matrix (Alt-Plexon → plexon-v3)

**Status:** living checklist for the Parity track (2026-08)  
**Related:** `event-quick-check-staging-smoke.md`, `coolify-plexon-v3-env-cheatsheet.md` §4b, `msqdx-shim-inventory.md`, `plexon-v3-ecosystem-deferrals.md`

## Legend

| Status | Meaning |
|--------|---------|
| **Done** | Feature parity in code + usable when env is set |
| **Ops** | Code exists; staging/runtime wiring required |
| **Polish** | Works; UI still progressive / bridge islands |
| **Later** | Explicitly deferred (needs product Go) |

## Matrix

| Bereich | Alt-Plexon | plexon-v3 | P | Status |
|---------|------------|-----------|---|--------|
| Auth / Register / Reset / Tokens | ja | ja | P0 | **Done** |
| Dashboard Usage + Chart | ja | ja (+ Magazine chart) | P0 | **Done** |
| Products Catalog + Entitlements | ja | ja | P0 | **Done** |
| Admin Companies / Users | ja | ja; edit at `/admin/users/[id]` | P0 | **Done** |
| Platform Projects | ja | Collections + Knowledge Pack | P0 | **Done** (v3 weiter) |
| Assistant Chat / Playbooks | ja | ja (Shell DS) | P0 | **Done** |
| Assistant Reports (pin cart / PDF / PPTX) | ja | ja; cart + downloads on `@msqdx/ui` | P1 | **Done** / Polish on generative blocks |
| **Event Quick Check** | ja | ja (Nav + page + 9 APIs); Domain/GEO = Checkion v3; Done = Magazine | P0 | **Ops** (env) / Results chrome **Done** |
| Board (Admin) | ja | ja; Prismion canvas = bridge island | P1 | **Polish** |
| MCP CHECKION / AUDION / ECHON | env | env; EQC-ECHON off in both | P2 | **Ops** / Later for ECHON in EQC |
| Billing / Stripe | nein | nein | P2 | **Later** |
| Brandion / Videon surfaces | geplant | geplant / hidden | P2 | **Later** |
| Collection Knowledge Pack | nein | neu in v3 | — | **Done** (v3-only) |
| Design-System Admin page | ja | Stub-Link | P2 | **Later** |

**Keine alten User-Pages fehlen als Route** (Inventar gleich + `/projects`-Hub neu).

---

## P0 — Wirkt „fehlend“ (Ops + E2E)

| Item | Status | Notes |
|------|--------|-------|
| Staging `CHECKION_API_*` → checkion-v3 | **Ops** | Coolify Wave-B env; see smoke doc |
| Staging `AUDION_API_*` → audion-v3 | **Ops** | Same |
| Knowledge-Pack federation live | **Ops** | `CHECKION_FEDERATION_MODE=live` + shared secret |
| EQC smoke Brief → PDF | **Ops** | Checklist in `event-quick-check-staging-smoke.md` |
| Clear empty/error when product API missing | **Done** | `EventQuickCheckReadinessBanner` + readiness API |

## P1 — Qualität / wahrgenommene Unfertigkeit

| Item | Status | Notes |
|------|--------|-------|
| EQC Report-Organisms / Magazine Done-UI | **Done** | `plexon-eqc-results` + SectionChrome / StatLede |
| EQC Domain + GEO → Checkion v3 APIs | **Done** | `/api/domain-scans`, `/api/geo-jobs` + adapters |
| Report download buttons off MUI | **Done** | `ReportBinaryDownloadButton` / PDF |
| `ReportCollectionBar` off MUI Drawer | **Done** | `@msqdx/ui` Dialog |
| Generative UI blocks still on bridge | **Polish** | Wave-7 island; see shim inventory |
| Board Prismion canvas bridge | **Polish** | Documented island |
| Dashboard admin user edit off `/` | **Done** | `/admin/users/[id]` |
| `ignoreBuildErrors: true` | **Polish** | Kept while ~40 `@msqdx/react` + MUI shim consumers remain |

## P2 — Ökosystem / später

See `plexon-v3-ecosystem-deferrals.md` — Brandion facet, Videon card, ECHON in EQC, Billing. **No implementation until explicit Go.**

---

## Success criteria (track)

- [ ] Staging: Admin plays EQC end-to-end without API workarounds (**Ops** — env on Coolify)
- [x] Nav „Quick Check“ → real flow (code + readiness UX when env missing)
- [x] This parity doc lists P0–P2 with Done / Ops / Polish / Later
