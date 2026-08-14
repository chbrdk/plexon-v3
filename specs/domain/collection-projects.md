# Collection projects — single user truth

**Status:** Accepted — 2026-07-31  
**Decisions:**  
- **1A** — always both product mirrors on create  
- **Fresh start** — plexon-v3 (+ companion product DBs) are new islands; **no** legacy backfill / no product-only insight cards  

**Companion:** `knowledge/platform-projects-central-creation.md` · `knowledge/platform-surface-ownership.md` · Knowledge Pack: `specs/domain/collection-knowledge-pack.md` · `specs/api/collection-knowledge-pack.md`

## Goal

Users see **one project** (a Collection). CHECKION, AUDION, BRANDION, and CREATION are **capabilities** of that project, not separate project types.

## Glossary

| Term | Meaning |
|------|---------|
| **Collection / Projekt** | User-facing name for a `platform_projects` row (company-scoped). |
| **Capability** | Product work inside the Collection (scans in CHECKION, personas in AUDION, brand analysis/guidelines in BRANDION, compositions in CREATION, …). |
| **Binding** | `platform_project_product_bindings` row linking Collection → product-local `projects.id`. |

## Invariants

1. Every **new** project is created as a PLEXON `platform_projects` Collection.
2. Create always ensures bindings for **checkion**, **audion**, **brandion**, and **creation**, then syncs them (brandion/creation upsert skipped while their public/service URL is unset — placeholder stays `pending`). Missing/failing sync → `pending` / `failed`, not a product-only project.
3. User copy never says “Audion project” / “Checkion project” / “Brandion project” / “Creation project” as a type. Prefer “Projekt” + capability labels.
4. Product UIs stay product-local (surface ownership unchanged); deep links always carry Collection context (`platformProjectId` / company hint) when available. Includes BRANDION/CREATION: `{PRODUCT}/projects?platformProjectId={id}` (not Checkion’s `platformProjectHint`). Cross-product capability handoff (e.g. AUDION explore URL → CHECKION `mode: single` scan) stays product-local APIs + bindings — see audion-v3 `specs/domain/checkion-single-scan-trigger.md` / checkion-v3 `specs/domain/audion-journey-scan-trigger.md`.
5. Access is Collection-scoped (`user_platform_project_assignments`), then expanded to product assignments via bindings.
6. **Insights list Collections only** — no synthetic product-only cards (v3 fresh DB).

## What users see vs internal

| User | Internal |
|------|----------|
| One project list | `platform_projects` via insights API |
| Open CHECKION / AUDION / BRANDION / CREATION | Binding `external_project_id` + product URL |
| Sync / not linked chips | Binding `sync_status` on capabilities |

## Create rule (1A)

- Canonical path: create Collection → `ensureBindingPlaceholders(checkion, audion, brandion, creation)` → sync products (brandion/creation when API base configured).
- **AUDION-first / CHECKION-first / BRANDION-first / CREATION-first origin** may start in a product UI, but the PLEXON result must still be a Collection with the origin product bound **and** the other capability mirrors synced (best-effort where product URLs allow).
- Assistant “nur Audion/Checkion/Brandion/Creation” intents map to Collection + all mirrors (Phase 1).

## Sync expectation

- Healthy Collection: checkion + audion (+ brandion / creation when configured) bindings `in_sync` with `external_project_id`.
- Partial failure is visible as capability status, not as a different project kind.
- Admin sync / retry remains the repair path.
- **Bulk repair (Phase 1):** `POST /api/platform/me/sync-capability-mirrors` (session) and `POST /api/platform/provisioning/sync-capability-mirrors` (service + `X-Plexon-User-Id`) upsert mirrors for **all Collections the user can see** (cap 50). Optional body `{ productIds: ['creation'] }` — CREATION `/projects` “Sync from Plexon” uses this so every accessible Collection gets a CREATION capability row.
- **Single Collection sync (P73):** `POST /api/platform/provisioning/projects/:platformProjectId/sync` (service + `X-Plexon-User-Id`) reuses `syncPlatformProjectToProducts` for **one** Collection the user can view. CREATION picker open/bind uses this so Brandion/Checkion/Audion/Creation siblings stay aligned — do not invent a parallel sync path.
- **List for product pickers (P71):** `GET /api/platform/me/accessible-collections` (session) and `GET /api/platform/provisioning/accessible-collections` (service + `X-Plexon-User-Id`) return `{ items: [{ id, name, status, companyId, domain }], totalAccessible, truncated }` from the **same** `listAccessiblePlatformProjectsForUser` (cap 50). CREATION Collection picker uses the provisioning GET — do not invent a second catalog.

## Phases

| Phase | Status |
|-------|--------|
| 0 Spec + UX language | done |
| 1 Create always both (+ brandion mirror) | done — brandion added 2026-08-06 |
| 2 Canonical project home UX | done — Brandion capability summary + launch on Collection home (2026-08-09) |
| 3 Legacy backfill | **cancelled** — fresh databases; no migration planned |
| 4 Canonical list + create hub (`/projects`) | done — 2026-07-31 |
| 5 Lifecycle (archive / restore / admin hard-delete) | done — 2026-08-11 |
| 6 CREATION capability mirror | **done (Wave 3)** — product id `creation` / repo `creation-v3`; `ensureBindingPlaceholders` + upsert via `CREATION_API_URL` / `NEXT_PUBLIC_CREATION_URL`; origin `POST …/creation-project-origin`. See `knowledge/creation-v3-onboarding.md`. |

## Phase 5 — Lifecycle

Lifecycle lives on `platform_projects.status` (`active` | `archived`). **No** `deletedAt` column.

| Action | Who | Behavior |
|--------|-----|----------|
| **Archive** | Company owner/admin (hub + detail) | `PATCH` status → `archived`, then `syncPlatformProjectToProducts` (upsert `status: archived` to CHECKION / AUDION / BRANDION / CREATION when configured). |
| **Restore** | Company owner/admin | Same path with `status: active`. |
| **Hard-Delete** | Plexon **global admin** only | Best-effort archive+sync, then `deletePlatformProject` (local cascade of bindings / packs / flows / assignments). Product mirrors stay **archived orphans** — no product DELETE in this wave. |

**Lists:** Default hub, insights, and home preview show **active** Collections only. Hub may opt in with `?includeArchived=1` / UI “Archivierte anzeigen” for restore. Admin company detail lists all statuses.

**APIs:**
- Company: `PATCH /api/platform/projects/:platformProjectId` — body `{ status: 'active' | 'archived' }` (`canManageCompany`).
- Admin: `PATCH /api/admin/platform-projects/:id` auto-syncs when status changes; `DELETE` requires global admin and archive-then-cascade.

## Canonical hub UX

- Nav **Projekte** → `/projects`: create form + full Collection list (same card look as dashboard insights).
- Home keeps a short preview (limit 6) with CTAs to the hub.
- Detail stays `/projects/[id]` (`PlatformProjectDashboard`): **Overview magazine** (nutshell teasers) then **work band** (knowledge TOC + capability catalogs for CHECKION / AUDION / **BRANDION** / **CREATION** + bindings). No separate `/overview` route — see `collection-knowledge-pack.md` § Magazine vs report.
- Dashboard BFF fetches Brandion/Creation via `GET {PRODUCT}/api/platform/provisioning/projects/{id}` → `brandion` / `creation` + launch links (`lib/platform-project-dashboard-fetch.ts`).
- Create POST: `POST /api/platform/companies/:id/platform-projects` (bindings + sync checkion/audion/brandion/creation).
- Product-first origins: `…/audion-project-origin`, `…/checkion-project-origin`, `…/brandion-project-origin`, `…/creation-project-origin`.

## Collection Knowledge Pack

Shared cross-product brief (profile, competitive, research distillates, GEO context, reserved Brandion facet) lives on the Collection — **not** inside thin product upsert and **not** as Tenant-Company default for client work. Structure = facets; product dossiers stay local and publish distillates. Spec: `specs/domain/collection-knowledge-pack.md`. Phasing: Spec → Pack CRUD in Plexon → GEO/Audion consume → Brandion facet later.

## Collection Test Flow

Cross-product **test program** on the Collection: AUDION journey nodes + CHECKION page-scan / score / issue gates, orchestrated in Plexon with a unified evidence verdict. Spec: `specs/domain/collection-test-flow.md`. Does **not** replace product-local boards; does **not** invent a second project type.

## UI rebuild note

Independent of UI migrate waves. Wave 5+ (Assistant) must compose Audion chat chrome **and** speak Collection projects — do not invent a second project model in the assistant UI.
