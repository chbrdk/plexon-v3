# CREATION v3 — Plexon onboarding

**Status:** Editor migration (Zaoly sunset) · **Date:** 2026-08-12  
**Product id:** `creation` · **Repo:** `creation-v3` · **Display:** CREATION  
**Editor SoT:** creation-v3 `/editor` + `@msqdx/ui` Storybook — Zaoly deep-link is fallback until E6

> Do not confuse with `knowledge/platform-projects-central-creation.md` (Collection create APIs).

## Locked decisions

| Decision | Choice |
|----------|--------|
| Product id | `creation` |
| Federated shell | `creation-v3` Next AppShell (`@msqdx/ui`) |
| Design tool | In-app `/editor` (React scene); legacy Zaoly via `CREATION_EDITOR_URL` until cutover |
| UI primitives | `@msqdx/ui` + Storybook `https://ds.projects-a.plygrnd.tech` |
| Federation | `2026-05-plexon-federation-v3` |
| Bindings | Wave 3 — upsert + `creation-project-origin` + placeholders |
| Auth bridge | Wave 4 — `launchCode` mint/redeem (legacy Host) |
| Domain hubs | Wave 5 — compositions + library |
| MCP | Wave 6 — `creation-mcp` + `CREATION_MCP_URL` |

## Wave map (shell + federation)

| Wave | Scope |
|------|-------|
| 0–6 | Specs → AppShell → editor deep-link → bindings → auth bridge → hubs → MCP — **landed** |

## Wave map (editor migration E+)

| Wave | Scope |
|------|-------|
| E0 | Specs/knowledge sunset + scene + workspace — creation-v3 + msqdx-ui + this doc |
| E1 | `msqdx-ui/knowledge/ds-keep-mapping.md` keep tags → exists/alias/gap |
| E2 | Close primitive gaps in Storybook (`pnpm ds:add`) |
| E3 | Editor chrome primitives (CanvasViewport, SelectionHandles, …) |
| E4 | creation-v3 `/editor` beta + Top-N + feature flag |
| E5 | Scene persistence + Collection binding |
| E6 | Parity sign-off; sunset Zaoly deep-link |

Program SoT: `creation-v3/specs/domain/editor-migration.md`

## Env (Plexon)

| Var | Role |
|-----|------|
| `NEXT_PUBLIC_CREATION_URL` | Public creation-v3 origin → registry lifecycle + default upsert base |
| `CREATION_API_URL` | Optional service base for upsert (defaults to public URL) |
| `CREATION_MCP_URL` | MCP Streamable HTTP base for assistant tools |

Coolify: `coolify-plexon-v3-env-cheatsheet.md` §4d · `knowledge/creation-mcp-assistant.md`.

## Smoke

- Staging shell: `https://creation-v3.projects-a.plygrnd.tech`
- In-app editor when `CREATION_EDITOR_INAPP` on: `/editor`
- MCP initialize → 200 on creation-mcp FQDN
