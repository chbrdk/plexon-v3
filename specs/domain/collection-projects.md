# Collection projects — single user truth

**Status:** Accepted — 2026-07-31  
**Decisions:**  
- **1A** — always both product mirrors on create  
- **Fresh start** — plexon-v3 (+ companion product DBs) are new islands; **no** legacy backfill / no product-only insight cards  

**Companion:** `knowledge/platform-projects-central-creation.md` · `knowledge/platform-surface-ownership.md` · Knowledge Pack: `specs/domain/collection-knowledge-pack.md` · `specs/api/collection-knowledge-pack.md`

## Goal

Users see **one project** (a Collection). CHECKION and AUDION are **capabilities** of that project, not separate project types.

## Glossary

| Term | Meaning |
|------|---------|
| **Collection / Projekt** | User-facing name for a `platform_projects` row (company-scoped). |
| **Capability** | Product work inside the Collection (scans in CHECKION, personas in AUDION, …). |
| **Binding** | `platform_project_product_bindings` row linking Collection → product-local `projects.id`. |

## Invariants

1. Every **new** project is created as a PLEXON `platform_projects` Collection.
2. Create always ensures bindings for **checkion** and **audion**, then syncs **both**. Missing/failing sync → `pending` / `failed`, not a product-only project.
3. User copy never says “Audion project” / “Checkion project” as a type. Prefer “Projekt” + capability labels.
4. Product UIs stay product-local (surface ownership unchanged); deep links always carry Collection context (`platformProjectId` / company hint) when available. Cross-product capability handoff (e.g. AUDION explore URL → CHECKION `mode: single` scan) stays product-local APIs + bindings — see audion-v3 `specs/domain/checkion-single-scan-trigger.md` / checkion-v3 `specs/domain/audion-journey-scan-trigger.md`.
5. Access is Collection-scoped (`user_platform_project_assignments`), then expanded to product assignments via bindings.
6. **Insights list Collections only** — no synthetic product-only cards (v3 fresh DB).

## What users see vs internal

| User | Internal |
|------|----------|
| One project list | `platform_projects` via insights API |
| Open CHECKION / AUDION | Binding `external_project_id` + product URL |
| Sync / not linked chips | Binding `sync_status` on capabilities |

## Create rule (1A)

- Canonical path: create Collection → `ensureBindingPlaceholders(checkion, audion)` → sync both products.
- **AUDION-first origin** may start in AUDION UI, but the PLEXON result must still be a Collection with AUDION bound **and** CHECKION synced.
- Assistant “nur Audion/Checkion” intents map to Collection + both (Phase 1).

## Sync expectation

- Healthy Collection: both bindings `in_sync` with `external_project_id`.
- Partial failure is visible as capability status, not as a different project kind.
- Admin sync / retry remains the repair path.

## Phases

| Phase | Status |
|-------|--------|
| 0 Spec + UX language | done |
| 1 Create always both | done |
| 2 Canonical project home UX | done |
| 3 Legacy backfill | **cancelled** — fresh databases; no migration planned |
| 4 Canonical list + create hub (`/projects`) | done — 2026-07-31 |

## Canonical hub UX

- Nav **Projekte** → `/projects`: create form + full Collection list (same card look as dashboard insights).
- Home keeps a short preview (limit 6) with CTAs to the hub.
- Detail stays `/projects/[id]` (`PlatformProjectDashboard`): **Overview magazine** (nutshell teasers) then **work band** (knowledge TOC + capability catalogs). No separate `/overview` route — see `collection-knowledge-pack.md` § Magazine vs report.
- Create POST: `POST /api/platform/companies/:id/platform-projects` (bindings + sync both).

## Collection Knowledge Pack

Shared cross-product brief (profile, competitive, research distillates, GEO context, reserved Brandion facet) lives on the Collection — **not** inside thin product upsert and **not** as Tenant-Company default for client work. Structure = facets; product dossiers stay local and publish distillates. Spec: `specs/domain/collection-knowledge-pack.md`. Phasing: Spec → Pack CRUD in Plexon → GEO/Audion consume → Brandion facet later.

## Collection Test Flow

Cross-product **test program** on the Collection: AUDION journey nodes + CHECKION page-scan / score / issue gates, orchestrated in Plexon with a unified evidence verdict. Spec: `specs/domain/collection-test-flow.md`. Does **not** replace product-local boards; does **not** invent a second project type.

## UI rebuild note

Independent of UI migrate waves. Wave 5+ (Assistant) must compose Audion chat chrome **and** speak Collection projects — do not invent a second project model in the assistant UI.
