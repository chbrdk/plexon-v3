# METRON v3 — Plexon onboarding

**Status:** Wave 9 MCP + Capability Catalog · **Date:** 2026-09-14  
**Product id:** `metron` · **Repo:** `metron-v3` · **Display:** METRON  
**GitHub:** `https://github.com/chbrdk/metron-v3`  
**Staging:** `https://metron-v3.projects-a.plygrnd.tech` · Coolify `8qkrk850d37er6subakpnx0r`  
**MCP:** `https://hh0pad7nwoupxnydpd7shb9r.projects-a.plygrnd.tech` · Coolify `hh0pad7nwoupxnydpd7shb9r` · Plexon `METRON_MCP_URL`

> Companion fit analysis: `knowledge/metron-ecosystem-fit.md`  
> Product specs SoT: `metron-v3/specs/domain/*`

## Locked decisions

| Decision | Choice |
|----------|--------|
| Product id | `metron` |
| Display | METRON |
| Federated shell | `metron-v3` Next AppShell (`@msqdx/ui`) — **Wave 1 landed** |
| UI primitives | `@msqdx/ui` + Storybook `https://ds.projects-a.plygrnd.tech` |
| Federation | `2026-05-plexon-federation-v3` |
| Project model | Collection capability only |
| KPI SSOT | Server-side evaluation + provenance |
| Excel depth (Phase 1) | Values + structure; no formula/pivot reconstruction |
| Architecture | Standalone federated app — **not** a Plexon module |

## Wave map

| Wave | Scope | Status |
|------|-------|--------|
| 0 | Specs, product id, paths, keep/drop, inventory tests | **done** |
| 1 | AppShell + health | **done** |
| 2 | Auth + registry + placeholders + origin + upsert | **done** |
| 3 | Stub hubs + Collection deep links | **done** |
| 4 | Excel/CSV import | **done** |
| 5 | Semantic model + KPI engine | **done** |
| 6 | Constrained dashboard viewer (DS Chart/Gauge/WidgetGrid) | **done** |
| 7 | Suite connectors + provenance UI | **done** |
| 8 | Dashboard Builder Excellence (templates + Flow chrome + PATCH) | **done** |
| 9 | MCP + Capability Catalog (+ Phase 2 writes + assistant UI) | **done** |

## Env (Plexon) — Wave 2

| Var | Role |
|-----|------|
| `NEXT_PUBLIC_METRON_URL` | Public metron-v3 origin → registry lifecycle + default upsert base |
| `METRON_API_URL` | Optional service base for upsert (defaults to public URL) |
| `METRON_MCP_URL` | MCP Streamable HTTP base for assistant tools (Wave 8) |

Coolify: §4f staging live — `https://metron-v3.projects-a.plygrnd.tech` · app `8qkrk850d37er6subakpnx0r` · project `sfx1f6qic7zswtt4v7blmevp`. `NEXT_PUBLIC_METRON_URL` + `METRON_API_URL` set on plexon-v3; metron `METRON_FEDERATION_MODE=live`.

## Plexon code touchpoints (Wave 2 checklist)

- [x] `PLATFORM_PRODUCT_IDS` includes `metron`
- [x] `lib/platform-products.ts` registry entry (`lifecycle: planned` until URL set)
- [x] `ensureBindingPlaceholders` includes `metron`
- [x] Origin route `POST /api/platform/provisioning/metron-project-origin`
- [x] Collection home capability catalog tile + dashboard BFF summary (Wave 3 polish)
- [x] Usage `service` enum accepts `metron`
- [x] Product switcher staging URL when siblings pick up FQDN (live: `https://metron-v3.projects-a.plygrnd.tech`)
- [x] Set `NEXT_PUBLIC_METRON_URL` on plexon-v3 Coolify for registry lifecycle
- [x] Spec: `specs/domain/collection-projects.md` Phase 8 → **done (Wave 2)**

## Smoke (after Wave 2)

- Staging: `https://metron-v3.projects-a.plygrnd.tech` · `GET /api/health` → `productId: metron` · `federationMode: live`
- Federation: `GET /api/federation/health` → `mode: live` · `configured: true`
- Plexon registry: `NEXT_PUBLIC_METRON_URL` / `METRON_API_URL` set on Coolify plexon-v3
- Staging FQDN recorded in `knowledge/paths.md`
- GitHub: `https://github.com/chbrdk/metron-v3`
