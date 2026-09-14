# METRON — Ecosystem fit evaluation (v0.1 concept)

**Status:** Wave 0 landed — 2026-09-14  
**Input:** METRON Grobkonzept v0.1 (Excel-first BI capability for PLEXON Suite)  
**Naming:** **Locked** — product id `metron`, display **METRON** (spoken “Metrion” ok; code/registry always `metron`).

## Verdict

**Yes — natively integrable**, if METRON is built as a **federated Collection capability** (same lane as BRANDION / CREATION / CHECKION), **not** as a module inside Plexon and **not** as a second project type.

The Grobkonzept aligns with suite intent (governance, provenance, suite-data as sources). The open question “eigenständige App vs. Modul in PLEXON?” is already answered by surface ownership: **eigenständige App + Federation v3**.

**Wave 0:** Specs + contracts live in repo `metron-v3`; Plexon Phase 8 planned in `collection-projects.md`. Onboarding: `knowledge/metron-v3-onboarding.md`.

## Fit matrix (Pflichten)

| Pflicht | Fit | How |
|---------|-----|-----|
| Auth | Strong | NextAuth credentials → Plexon `POST /api/auth/validate-credentials`; service routes with `X-Service-Secret` + `X-Plexon-Contract-Version: 2026-05-plexon-federation-v3` |
| Collection model | Strong | Capability under `platform_projects`; local mirror via bindings; UX says **Projekt**, never “Metron project” |
| Project sync | Strong | `ensureBindingPlaceholders` + upsert `PUT …/provisioning/projects/{id}` + `…/metron-project-origin`; P71 accessible-collections; P73 single-collection sync |
| Access Model B | Must design for | Creator / explicit assignment only — company membership ≠ visibility. Dashboard share must not invent company-wide ACL |
| Surface ownership | Strong | Domain (datasets, KPIs, dashboards, import jobs) stays product-local; Plexon keeps identity, registry, usage, Collection home summaries |
| Paths / env | Strong | `NEXT_PUBLIC_METRON_URL`, `METRON_API_URL`, `METRON_MCP_URL` in Plexon env + product `paths.ts` / `runtime-config.ts`; document in both `knowledge/paths.md` |
| Usage / billing | Strong | Emit `POST /api/services/usage/events` (`service: metron`) for import / query / dashboard-view units |
| MSQDX UI | Strong with gaps | Shell = Brandion/Creation pattern (`AppFrame`, `NavRail`, …). Chart/dashboard-builder organisms **missing** in `@msqdx/ui` today — add upstream before inventing app clones |
| Central Assistant | Required | Mount `PlatformAssistantHost` → Plexon `/assistant/embed`; later catalog caps e.g. `metron.kpi.list`, `metron.dashboard.summarize` |
| Specs-first | Required | `metron-v3/specs/domain/*` + `plexon-v3` binding/registry updates before behavior |

## Recommended architecture (locks open Q §6e)

```
PLEXON (control plane)
  └─ Collection + binding productId=metron
       └─ metron-v3 (Next AppShell + BFF + domain DB)
            ├─ datasets / semantic model / KPI defs / dashboards (product-local)
            ├─ Excel/CSV import jobs
            └─ connectors → CHECKION/AUDION/… read APIs + Knowledge Pack distillates
```

**Do not:** embed a full BI engine inside Plexon; do not share Postgres with other products; do not create product-only projects.

## Frontend IA (magazine-compatible)

Mirror Brandion/Checkion shell + magazine vs report:

| Surface | Role |
|---------|------|
| `/` | Home magazine — suite KPI teasers / recent dashboards |
| `/projects` | Collection picker (accessible-collections only) |
| `/projects/[id]` | Capability work band: datasets · KPIs · dashboards |
| `/datasets`, `/kpis`, `/dashboards` | Hubs (list = magazine tiles; detail = report depth / builder) |
| `/settings` | Quiet settings + API tokens if needed |
| Shell | `BrandCorner` **METRON** + product switcher; Assistant FAB |

**DS reuse now:** `AppFrame`, `NavRail`, `SectionChrome`, `Panel`, `Field`/`Input`/`Select`, `DataTable`, `MetricChip`, `EmptyState`, `Dialog`, `ChatOverlay`.

**DS to add in `msqdx-ui` (before builder ships):** Chart (bar/line/area/spark), Gauge/KPI tile, WidgetGrid / DashboardCanvas, Import wizard steps. Tokens: existing `forestChart` / chart token lanes.

**Do not:** MUI, `@msqdx/react`, Power-BI-clone chrome, second project model in UI copy.

## Domain tension to resolve early

1. **KPI “über Projekte hinweg wiederverwendbar”** vs Access Model B  
   - Prefer: **company-scoped KPI library** with **Collection bindings** (reuse definitions, still enforce Collection visibility on data).  
   - Avoid: global KPI objects that leak datasets across Collections the user cannot see.

2. **Teilen & Rechte**  
   - Layer 1 = Collection access (Model B).  
   - Layer 2 = product-local roles on dashboard/KPI (view / edit / publish) — analogous to Brandion/Checkion gates, not a parallel company ACL.

3. **KPI engine location**  
   - **Server-side** evaluation + persisted snapshot/provenance for Governance (Quelle · Stand · Audit). Client may preview; SSOT is server.

4. **Live-ness**  
   - Phase 1: import/snapshot refresh (batch). Live suite connectors = pull-on-open or scheduled sync — not streaming unless justified.

5. **Excel depth**  
   - Phase 1: **values + structure** (sheets, headers, merged cells → flatten with warnings). Formulas/Pivots = later or “import computed values only”.

6. **Connectors after Excel**  
   - Next: suite-native (CHECKION scores/issues, AUDION journey metrics, Knowledge Pack facets), then Sheets/DB. CRM last.

## Onboarding wave map (CREATION-style)

| Wave | Scope | Status |
|------|-------|--------|
| 0 | Specs: product id, federation, Collection binding, keep/drop vs Power BI | **done** — `metron-v3` |
| 1 | Repo `metron-v3`: AppShell, paths, health | **done** — 2026-09-14 |
| 2 | Plexon registry + placeholders + origin + upsert summary fields | **done** — 2026-09-14 |
| 3 | Stub hubs (datasets / KPIs / dashboards) + Collection deep links | planned |
| 4 | Excel/CSV import assistant (tolerant, transparent errors) | planned |
| 5 | Semantic model + relationships + server KPI formulas | planned |
| 6 | Constrained dashboard builder (widget set fixed; layout grid) | planned |
| 7 | Suite connectors + provenance UI | planned |
| 8 | MCP + Capability Catalog ids for Assistant | planned |

## Plexon touchpoints (checklist) — Wave 2

- [x] `PLATFORM_PRODUCT_IDS` + `lib/platform-products.ts` entry (`lifecycle: planned` until URL set)
- [x] `ensureBindingPlaceholders` includes `metron`
- [x] Origin route `…/metron-project-origin`
- [ ] Collection home capability catalog tile + dashboard BFF summary fetch (Wave 3 polish)
- [x] Env stubs in `knowledge/paths.md` (Coolify staging FQDN TBD)
- [x] Usage `service` enum accepts `metron`
- [ ] Product switcher static URLs in sibling apps when staging exists

Wave 0 docs checklist: `specs/domain/metron-capability.md` · `knowledge/metron-v3-onboarding.md` · `collection-projects.md` Phase 8 row.

## Non-goals (protect scope)

- Replacing Power BI / Looker for enterprise warehouse BI
- Client-only formula engine without audit trail
- Product-only projects or “Metron workspace” outside Collections
- Building chart primitives only inside metron-v3 when they belong in `@msqdx/ui`

## Related SoT

- `specs/domain/collection-projects.md`
- `knowledge/platform-surface-ownership.md`
- `knowledge/platform-federation-contract.md`
- `knowledge/creation-v3-onboarding.md` (template)
- `knowledge/ui-rebuild-reuse.md`
- Brandion `specs/domain/app-shell.md` / `plexon-federation.md`
