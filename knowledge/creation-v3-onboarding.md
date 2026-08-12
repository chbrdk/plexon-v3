# CREATION v3 — Plexon onboarding

**Status:** Wave 5 domain hubs · **Date:** 2026-08-12  
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
| Auth bridge | Wave 4 — `launchCode` mint/redeem (Host consumer later) |
| Domain hubs | Wave 5 — compositions stubs magazine + library fixture catalog |

## Wave map

| Wave | Scope |
|------|-------|
| 0 | Specs + namespace (this doc + product specs) |
| 1 | AppShell + `NEXT_PUBLIC_CREATION_URL` registry + Assistant embed `product=creation` |
| 2 | Editor launch via `CREATION_EDITOR_URL` — **landed** |
| 3 | Collection bindings + upsert + origin — **landed** |
| 4 | Auth bridge (launchCode mint/redeem) — **landed** |
| 5 | Domain hubs (compositions magazine + library overview) — **landed** |
| 6+ | MCP / live catalog when needed |

## Env (Plexon)

| Var | Role |
|-----|------|
| `NEXT_PUBLIC_CREATION_URL` | Public creation-v3 origin → registry lifecycle + default upsert base |
| `CREATION_API_URL` | Optional service base for upsert (defaults to public URL) |

Coolify: `coolify-plexon-v3-env-cheatsheet.md` §4d.

## Smoke (Wave 3–5)

1. creation-v3 `PUT /api/platform/provisioning/projects/{uuid}` with secret → `{ status: applied, externalProjectId }`
2. Plexon create Collection → `creation` binding `in_sync` when CREATION URL set
3. CREATION `/projects?platformProjectId=` redirects when bound
4. `POST …/creation-project-origin` returns Collection UUID
5. `POST /api/editor/launch-code` → code; redeem with service secret once
6. `/compositions` lists fixture stubs; `/library` shows WC catalog snapshot

## Related

- `creation-v3/specs/domain/app-shell.md` · `plexon-federation.md` · `auth-bridge.md` · `domain-hubs.md` · `specs/api/projects.md`
- `creation-v3/knowledge/paths.md` · `knowledge/collection-bindings.md` · `knowledge/auth-bridge.md` · `knowledge/library-fixture-sources.md`
- `specs/domain/collection-projects.md` Phase 6
- Zaoly: `knowledge/plexon-creation-v3-attach.md` (in Zaoly repo)
