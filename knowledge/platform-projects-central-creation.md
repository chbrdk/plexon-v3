# Collection projects (PLEXON) — central creation

**Product model:** `specs/domain/collection-projects.md` (Accepted — Collection = sole user-facing project).

- **Source of truth:** `platform_projects` in PLEXON, scoped under a **Company**. User language: **Projekt / Collection** — not “platform vs product project types.”
- **Mirrors (capabilities):** CHECKION and AUDION keep local `projects` rows with `platform_project_id`, created/updated via **service provisioning** (`PUT .../platform/provisioning/projects/{id}`).
- **Create invariant (1A):** Every **new** Collection always gets binding placeholders for **checkion** and **audion**, then syncs **both**. A failed product sync is `pending`/`failed` on that capability — not a finished product-only project.
- **AUDION-first origin:** AUDION may create locally, then call `POST /api/platform/provisioning/audion-project-origin` (Body: `audionProjectId`, `name`, `domain?`, `ownerPlexonUserId`, `platformCompanyId`). PLEXON creates `platform_projects`, binds the existing **AUDION** UUID, and syncs **CHECKION** so the Collection ends with both capabilities. Idempotent calls repair missing CHECKION. AUDION env: `PLEXON_API_BASE_URL` (or `PLEXON_AUTH_URL`), `PLEXON_SERVICE_SECRET`; `platform_company_id` required when the user has `plexon_user_id` and PLEXON URL + secret are set.
- **Create APIs (Phase 1):** Admin and platform company project POST always `ensureBindingPlaceholders` then `syncPlatformProjectToProducts` for **both** products.
- **Access:** `user_platform_project_assignments` (PLEXON) expands into product-local `projectAssignments` when bindings have `external_project_id`. Dashboard **“Your projects”** also resolves Collections from entitlement project mappings via bindings.
- **Legacy (2C):** Product-only rows may still appear in insights as **not linked yet** (`openPlatformProject: false`, synthetic ids). No backfill in Phase 0; see migrate doc for later.
- **Dashboard API:** `GET /api/platform/projects/{id}/dashboard` (session) aggregates CHECKION/AUDION with service headers incl. `X-Plexon-User-Id`.
- **Open-AUDION links:** Dashboard and `GET /api/platform/me/project-insights` set AUDION admin URL with `platformProjectHint` (when AUDION summary exists) and always **`platformCompanyId`** (`platform_projects.company_id`). Builder: `lib/audion-admin-launch-url.ts`.
- **Federation contract:** `2026-05-plexon-federation-v3` (project upsert + summary GET).
