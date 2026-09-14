# METRON v3 — Plexon onboarding

**Status:** Wave 1 AppShell (Wave 0 specs complete) · **Date:** 2026-09-14  
**Product id:** `metron` · **Repo:** `metron-v3` · **Display:** METRON  
**GitHub:** `https://github.com/chbrdk/metron-v3`

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
| 2 | Auth + registry + placeholders + origin + upsert | planned |
| 3 | Stub hubs + Collection deep links | planned |
| 4 | Excel/CSV import | planned |
| 5 | Semantic model + KPI engine | planned |
| 6 | Dashboard builder (after DS Chart/Gauge/WidgetGrid) | planned |
| 7 | Suite connectors + provenance UI | planned |
| 8 | MCP + Capability Catalog | planned |

## Env (Plexon) — Wave 2

| Var | Role |
|-----|------|
| `NEXT_PUBLIC_METRON_URL` | Public metron-v3 origin → registry lifecycle + default upsert base |
| `METRON_API_URL` | Optional service base for upsert (defaults to public URL) |
| `METRON_MCP_URL` | MCP Streamable HTTP base for assistant tools (Wave 8) |

Coolify: add §4f to `coolify-plexon-v3-env-cheatsheet.md` when staging exists.

## Plexon code touchpoints (Wave 2 checklist)

- [ ] `PLATFORM_PRODUCT_IDS` includes `metron`
- [ ] `lib/platform-products.ts` registry entry (`lifecycle: planned` until URL set)
- [ ] `ensureBindingPlaceholders` includes `metron`
- [ ] Origin route `POST /api/platform/provisioning/metron-project-origin`
- [ ] Collection home capability catalog tile + dashboard BFF summary
- [ ] Usage `service` enum accepts `metron`
- [ ] Product switcher staging URL when FQDN exists
- [ ] Spec: `specs/domain/collection-projects.md` Phase 8 → done when landed

## Smoke (after Wave 1+)

- Local: `http://localhost:3011` · `GET /api/health` → `productId: metron`
- Federation: `GET /api/federation/health` → `mode: dummy` until Wave 2
- Staging FQDN: TBD → record in `knowledge/paths.md`
- GitHub: `https://github.com/chbrdk/metron-v3`
