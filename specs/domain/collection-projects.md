# Collection projects — single user truth

**Status:** Accepted — 2026-07-31  
**Decisions:** 1A (always both product mirrors on create) · 2C (legacy product-only deferred; no backfill this phase)  
**Companion:** `knowledge/platform-projects-central-creation.md` · `knowledge/platform-surface-ownership.md`

## Goal

Users see **one project** (a Collection). CHECKION and AUDION are **capabilities** of that project, not separate project types.

## Glossary

| Term | Meaning |
|------|---------|
| **Collection / Projekt** | User-facing name for a `platform_projects` row (company-scoped). |
| **Capability** | Product work inside the Collection (scans in CHECKION, personas in AUDION, …). |
| **Binding** | `platform_project_product_bindings` row linking Collection → product-local `projects.id`. |
| **Legacy / unlinked** | Product-local project without a usable Collection card (`openPlatformProject: false` / synthetic insight id). Still shown; not a second project type in copy. |

## Invariants (target)

1. Every **new** project is created as a PLEXON `platform_projects` Collection.
2. Create always ensures bindings for **checkion** and **audion**, then syncs **both**. Missing/failing sync → `pending` / `failed`, not a product-only project.
3. User copy never says “Audion project” / “Checkion project” as a type. Prefer “Projekt” + capability labels.
4. Product UIs stay product-local (surface ownership unchanged); deep links always carry Collection context (`platformProjectId` / company hint) when available.
5. Access is Collection-scoped (`user_platform_project_assignments`), then expanded to product assignments via bindings.

## What users see vs internal

| User | Internal |
|------|----------|
| One project list | `platform_projects` + insights API |
| Open CHECKION / AUDION | Binding `external_project_id` + product URL |
| Sync / not linked chips | Binding `sync_status` |
| “Not linked yet” (legacy) | Standalone / synthetic insight rows (Phase 0 keep; Phase 3 migrate) |

## Create rule (1A)

- Canonical path: create Collection → `ensureBindingPlaceholders(checkion, audion)` → sync both products.
- **AUDION-first origin** may start in AUDION UI, but the PLEXON result must still be a Collection with AUDION bound **and** CHECKION synced (same end state as PLEXON-first). Target: do not leave AUDION-only as a finished create.
- Assistant “nur Audion/Checkion” intents are **out of target model** (Phase 1: map to Collection+both or refuse).

## Sync expectation

- Healthy Collection: both bindings `in_sync` with `external_project_id`.
- Partial failure is visible as capability status, not as a different project kind.
- Admin sync / retry remains the repair path.

## Phase 0 (done)

- Spec + knowledge language.
- UX copy: Insights / project detail / related strings → Collection wording; legacy cards labeled, **not** migrated.

## Phase 1 (done — 2026-07-31)

- Assistant create intents always `create_project` (Collection); `detectCreateProjectTarget` → `platform` only.
- Legacy `create_audion_project` / `create_checkion_project` handlers redirect to Collection workflow.
- Admin + platform company project POST: `ensureBindingPlaceholders` + sync **both** products.
- AUDION-origin: Collection + AUDION bound + CHECKION sync; idempotent repair ensures placeholders + CHECKION.

**Still deferred:** Schema changes, backfill (Phase 3).

## Deferred

| Phase | Work |
|-------|------|
| **2** | `/projects/[id]` as canonical project home; insights = one “Your projects” list; assistant always `platformProjectId`. |
| **3** | Backfill / retire standalone insights (`knowledge/migrate-msqdx-platform-projects.md`); contract bump only if federation behavior changes. |

## UI rebuild note

Independent of UI migrate waves. Wave 5+ (Assistant) must compose Audion chat chrome **and** speak Collection projects — do not invent a second project model in the assistant UI.
