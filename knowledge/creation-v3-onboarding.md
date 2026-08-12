# CREATION v3 — Plexon onboarding

**Status:** Wave 3 landed · **Date:** 2026-08-12  
**Product id:** `creation` · **Repo:** `creation-v3` · **Display:** CREATION  
**Editor runtime:** Zaoly (`msqdx_creation_v2/MSQDX CREATION`) — not ported into Next

> Do not confuse with `knowledge/platform-projects-central-creation.md` (Collection create APIs).

## Locked decisions

| Decision | Choice |
|----------|--------|
| Product id | `creation` |
| Federated shell | `creation-v3` Next AppShell (`@msqdx/ui`) |
| Design tool | Zaoly Vite editor (deep-link via `CREATION_EDITOR_URL`) |
| Federation | `2026-05-plexon-federation-v3` |
| Bindings | Wave 3 — upsert + `creation-project-origin` + placeholders |

## Wave map

| Wave | Scope |
|------|-------|
| 0 | Specs + knowledge (this doc + product specs) |
| 1 | AppShell + `NEXT_PUBLIC_CREATION_URL` registry + Assistant embed `product=creation` |
| 2 | Editor launch via `CREATION_EDITOR_URL` — **landed** |
| 3 | Collection bindings + upsert + origin — **landed** |
| 4+ | Auth bridge polish, domain hubs, MCP/catalog when needed |

## Env (Plexon)

| Var | Role |
|-----|------|
| `NEXT_PUBLIC_CREATION_URL` | Public creation-v3 origin → registry lifecycle + default upsert base |
| `CREATION_API_URL` | Optional service base for upsert (defaults to public URL) |

Coolify: `coolify-plexon-v3-env-cheatsheet.md` §4d.

## Smoke (Wave 3)

1. creation-v3 `PUT /api/platform/provisioning/projects/{uuid}` with secret → `{ status: applied, externalProjectId }`
2. Plexon create Collection → `creation` binding `in_sync` when CREATION URL set
3. CREATION `/projects?platformProjectId=` redirects when bound
4. `POST …/creation-project-origin` returns Collection UUID

## Related

- `creation-v3/specs/domain/app-shell.md` · `plexon-federation.md` · `specs/api/projects.md`
- `creation-v3/knowledge/paths.md` · `knowledge/collection-bindings.md`
- `specs/domain/collection-projects.md` Phase 6
- Zaoly: `knowledge/plexon-creation-v3-attach.md` (in Zaoly repo)
