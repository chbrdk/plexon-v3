# Central Assistant Flyout — architecture

Stand: 2026-08-10 (hybrid restyle)

## Summary

Cross-app **platform Assistant** as a dock-end chat flyout (`min(32rem)`). **Hybrid delivery:** same-origin Plexon mounts `AssistantChat` in-process; product apps iframe Plexon `/assistant/embed` with theme sync. Audion persona `/chat` stays separate.

## Specs

- Domain: `specs/domain/central-assistant-flyout.md`
- API / protocol: `specs/api/assistant-embed.md`
- DS chrome: `msqdx-ui/specs/domain/msqdx-ui-chat-overlay.md`
- Orchestrator: `knowledge/plexon-assistant-orchestrator.md`

## Paths

| Constant | Path |
|----------|------|
| `PATH_ASSISTANT` | `/assistant` (expand) |
| `PATH_ASSISTANT_EMBED` | `/assistant/embed` |
| `pathAssistantEmbed(...)` | embed + query (`product`, `project`, `c`, `capability`, `pathname`, **`theme`**) |
| `pathAssistantChat(id)` | expand + `?c=` |
| `ASSISTANT_EMBED_THEME_QUERY_PARAM` | `theme` |

See `knowledge/paths.md`.

## Delivery

| Host | Sheet body |
|------|------------|
| Plexon (empty / same-origin base) | Native `<AssistantChat presentation="overlay" />` |
| Audion / Checkion / Brandion | iframe → `{NEXT_PUBLIC_PLEXON_URL}/assistant/embed?…&theme=` |

Chrome: `ChatOverlay` owns title / expand / close. Overlay chat keeps compact toolbar (history + project) only.

## Theme sync

1. Host reads `html[data-theme]`.
2. Pass on embed URL + postMessage `assistant:theme` `{ themeId }`.
3. Embed allowlists and applies `data-theme`.

## Rollout

1. `@msqdx/ui` `ChatOverlay` organism (32rem dock-end).
2. Plexon hybrid host + embed theme + presentation chrome.
3. Product hosts pass theme.
4. Contract + shell smoke tests.

## Host checklist

- [x] FAB in authenticated AppShell
- [x] `ChatOverlay` dock-end
- [x] Hybrid: native same-origin / iframe cross-origin
- [x] Theme query + `assistant:theme`
- [x] postMessage origin checks
- [x] Expand opens Plexon `/assistant?c=…`
- [x] No hardcoded URLs

## Visual notes (2026-08-10)

Do **not** force `--color-bg-subtle` / `--color-text-on-light` on `[data-plexon-assistant-chat]` — that paints a cream paper panel under dark `data-theme` and makes empty-state / composer unreadable. Overlay uses transparent + `var(--ink)`; suggestion chip cloud is hidden in `presentation=overlay`.

Overlay must **not** `router.replace(/assistant?c=…)` on send — that jumps users out of the flyout onto the expand page (and hides the FAB). URL sync is expand-only; flyout keeps `conversationId` in React state + `onConversationChange`.

### Activity + answer chrome (follow-up)

- `AgentActivityTrace` / `PlannerStepCard`: `Panel variant="default"` — never `data-msqdx-surface="light"` inside the flyout.
- Cream paper override stays scoped to `[data-plexon-content]` only; assistant chat remaps any residual light surfaces to `var(--panel)` / `var(--ink)`.
- Assistant answers render via `AssistantChatAnswer` + `lib/assistant/format-chat-answer.ts` (Audion SoT) into DS `.chat-answer-*` blocks — not raw pre-wrap markdown.
