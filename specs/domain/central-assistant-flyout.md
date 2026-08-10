# Central Assistant Flyout (Cross-App)

**Status:** Accepted — 2026-08-10  
**Implements:** `components/PlatformAssistantHost.tsx` · `app/assistant/embed/page.tsx` · `components/assistant/AssistantChat.tsx` (`presentation`)  
**DS:** `@msqdx/ui` `ChatOverlay` · `chat.css` (`.chat-overlay`, `.chat-overlay-sheet`, `.chat-panel-compact`, dock-end)  
**API:** `specs/api/assistant-embed.md`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`  
**Product model:** `specs/domain/collection-projects.md` — Collections only (`platformProjectId`)

## Goals

1. One **platform Assistant** across Plexon, Audion, Checkion, and Brandion v3 — admin + product help without leaving the current app.
2. **Primary entry** = classical chat flyout (dock-end overlay), not a full-page workstation.
3. **Expand** (`/assistant`) is the same conversation in a full-height shell — deep link / “Open workspace” only.
4. Brain stays the existing Plexon orchestrator (`/api/assistant/*`); no second backend or conversation store.
5. Chrome from `@msqdx/ui` only — no MUI, no `@msqdx/react`, no second chat layout.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Rollout | Day-1 mounts in all four v3 AppShells |
| Primary IA | Flyout (`ChatOverlay` dock-end) |
| Full page | Expand / deep-link of the same `conversationId` |
| Cross-app delivery | Plexon-hosted `/assistant/embed` inside host `ChatOverlay` iframe |
| Audion `/chat` | Remains product-local persona/TG chat — **not** merged |

## Information architecture

| Surface | Route / mount | Role |
|---------|---------------|------|
| Flyout (primary) | Host FAB → `ChatOverlay` → iframe `PATH_ASSISTANT_EMBED` | Everyday help / admin |
| Expand (secondary) | `PATH_ASSISTANT` (+ `?c=` / `?project=`) | Long workflows, reports, history-heavy sessions |
| Rail “Assistant” | Nav item → Expand | Deep link into workspace; does **not** invent a second chat |
| Persona Chat (Audion) | Audion `/chat` | Editorial persona/TG — separate product |

## Host mount (every AppShell)

Authenticated shells MUST mount `PlatformAssistantHost`:

- FAB (bottom-end) opens/closes the overlay.
- Overlay = `@msqdx/ui` `ChatOverlay` (`placement="dock-end"` default).
- Sheet body = iframe → `{PLEXON_PUBLIC_URL}{PATH_ASSISTANT_EMBED}` with query context (see API spec).
- Paths and Plexon base URL from `lib/constants` / `runtime-config` / `paths` — **never hardcode**.
- When `platformProjectId` is known in the host route, pass it; otherwise product-only context.

## Presentation modes (Plexon chat root)

`AssistantChat` accepts `presentation: 'overlay' | 'expand'`:

| Mode | Chrome | Use |
|------|--------|-----|
| `overlay` | `.chat-panel.chat-panel-compact` inside embed | Embed route |
| `expand` | `.chat-panel.chat-panel-open` full height in AppShell | `/assistant` |

Same stream client, history Flyout pattern, Collection picker, generative blocks.

## Collection context

- Prefer `platformProjectId` (Collection) — see `collection-projects.md`.
- Embed/expand query: `ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM` (`project`).
- Conversation restore: `ASSISTANT_CONVERSATION_QUERY_PARAM` (`c`).

## Non-goals

- Merging Audion persona chat into this overlay.
- Shipping domain MessageList/Composer/orchestrator logic in `@msqdx/ui` (overlay shell only).
- A second assistant backend or parallel conversation tables.
- Deploying Coolify prod from this island.

## Acceptance

1. Spec + API + knowledge linked from `knowledge/specs-index.md` and `knowledge/paths.md`.
2. Plexon AppShell: FAB opens flyout; rail Assistant opens expand.
3. Audion / Checkion / Brandion AppShells mount the same host pattern against Plexon embed URL from config.
4. Expand with `?c=` continues the conversation started in the flyout.
5. Zero hardcoded Plexon/product URLs in host components.
6. Contract + shell smoke tests pass (see `knowledge/central-assistant-flyout.md`).
