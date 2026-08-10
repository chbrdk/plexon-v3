# Central Assistant Flyout (Cross-App)

**Status:** Accepted — 2026-08-10 (hybrid restyle)  
**Implements:** `components/PlatformAssistantHost.tsx` · `app/assistant/embed/page.tsx` · `components/assistant/AssistantChat.tsx` (`presentation`)  
**DS:** `@msqdx/ui` `ChatOverlay` · `chat.css` (`.chat-overlay`, `.chat-overlay-sheet`, `.chat-panel-compact`, dock-end `min(32rem)`)  
**API:** `specs/api/assistant-embed.md`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`  
**Page context:** `specs/domain/assistant-page-context.md` — host publishes structured page/entity context (EQC first)

## Goals

1. One **platform Assistant** across Plexon, Audion, Checkion, and Brandion v3 — admin + product help without leaving the current app.
2. **Primary entry** = classical chat flyout (dock-end overlay), not a full-page workstation.
3. **Expand** (`/assistant`) is the same conversation in a full-height shell — deep link / “Open workspace” only.
4. Brain stays the existing Plexon orchestrator (`/api/assistant/*`); no second backend or conversation store.
5. Chrome from `@msqdx/ui` only — no MUI, no `@msqdx/react`, no second chat layout.
6. **Hybrid delivery** + **theme follow host** (dark/light / `data-theme`).

## Locked decisions

| Decision | Choice |
|----------|--------|
| Rollout | Day-1 mounts in all four v3 AppShells |
| Primary IA | Flyout (`ChatOverlay` dock-end) |
| Full page | Expand / deep-link of the same `conversationId` |
| Delivery | **Hybrid:** same-origin Plexon → in-process `AssistantChat`; cross-app → iframe `/assistant/embed` |
| Sheet width | Dock-end `min(32rem, 100%)`, token surfaces (`--panel` / `--bg1` / `--ink` / `--line`) |
| Chrome | **Single header:** `ChatOverlay` owns title / expand / close; overlay `AssistantChat` keeps compact toolbar (history + project) only |
| Theme | Host `data-theme` → embed query `theme` + postMessage `assistant:theme` |
| Page context | Host publishes `AssistantPageContext` (pathname + capability + entity ids); complete hydrates EQC runs into system prompt (`assistant-page-context.md`) |
| Audion `/chat` | Remains product-local persona/TG chat — **not** merged |

## Information architecture

| Surface | Route / mount | Role |
|---------|---------------|------|
| Flyout (primary, Plexon) | FAB → `ChatOverlay` → **native** `AssistantChat` `presentation="overlay"` | Everyday help / admin |
| Flyout (primary, products) | FAB → `ChatOverlay` → iframe `PATH_ASSISTANT_EMBED` | Same UX via embed |
| Expand (secondary) | `PATH_ASSISTANT` (+ `?c=` / `?project=`) | Long workflows, reports, history-heavy sessions |
| Rail “Assistant” | Nav item → Expand | Deep link into workspace; does **not** invent a second chat |
| Persona Chat (Audion) | Audion `/chat` | Editorial persona/TG — separate product |

## Host mount (every AppShell)

Authenticated shells MUST mount `PlatformAssistantHost`:

- FAB (bottom-end) opens/closes the overlay.
- Overlay = `@msqdx/ui` `ChatOverlay` (`placement="dock-end"` default).
- **Same-origin / empty `plexonPublicBase`:** sheet body = `<AssistantChat presentation="overlay" />` (no iframe).
- **Cross-origin product hosts:** sheet body = iframe → `{PLEXON_PUBLIC_URL}{PATH_ASSISTANT_EMBED}` with query context (see API spec), including `theme`.
- Paths and Plexon base URL from `lib/constants` / `runtime-config` / `paths` — **never hardcode**.
- When `platformProjectId` is known in the host route, pass it; otherwise product-only context.
- Expand control lives in `ChatOverlay` `headerActions` (host) when native; embed may still emit `assistant:expand`.

## Presentation modes (Plexon chat root)

`AssistantChat` accepts `presentation: 'overlay' | 'expand'`:

| Mode | Chrome | Use |
|------|--------|-----|
| `overlay` | `.chat-panel.chat-panel-compact`; **no** duplicate page title / expand row — compact toolbar only | Native flyout + embed route |
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
- Full shared Assistant SDK / in-process chat in product apps (later wave).
- Assistant-driven DOM editing of host pages (navigate/expand/context only).
- Deploying Coolify prod from this island.

## Acceptance

1. Spec + API + knowledge linked from `knowledge/specs-index.md` and `knowledge/paths.md`.
2. Plexon AppShell: FAB opens flyout with **native** chat; rail Assistant opens expand.
3. Audion / Checkion / Brandion AppShells mount iframe host against Plexon embed URL from config + theme sync.
4. Expand with `?c=` continues the conversation started in the flyout.
5. Zero hardcoded Plexon/product URLs in host components.
6. Contract + shell smoke tests pass (see `knowledge/central-assistant-flyout.md`).
