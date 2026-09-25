# Central Assistant Flyout — architecture

Stand: 2026-08-10 (hybrid restyle)

## Summary

Cross-app **platform Assistant** as a dock-end chat flyout (`min(32rem)`). **Hybrid delivery:** same-origin Plexon mounts `AssistantChat` in-process; product apps iframe Plexon `/assistant/embed` with theme sync. Audion persona chat stays separate — EQC hosts native `PersonaChatWorkspace` in its own `ChatOverlay` with Audion API via BFF (`knowledge/eqc-persona-chat.md` Wave C6).

### Feature parity (cross-app)

Chat chrome features (attachments, Stop, streaming plain text, markdown/tables, generative UI) live **only** in plexon-v3 `AssistantChat`. Product FABs are thin hosts: same iframe → same features after each Plexon deploy. Hosts MUST:

1. Freeze `iframe.src` while the flyout is open (no remount on `assistant:conversation` / theme / entity churn) — see `specs/api/assistant-embed.md` § Iframe stability.
2. Post `assistant:theme` with `{ themeId }` (not `theme`).
3. Point `NEXT_PUBLIC_PLEXON_URL` at the live plexon-v3 island.

**Not the same surface:** Audion `/chat` persona workspace is a separate product chat (persona Vision + document merge). Do not expect persona-only UX inside the Platform Assistant flyout.

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

Chrome: `ChatOverlay` owns title / expand / close. Overlay chat keeps compact toolbar (history + new chat) only — Collection binding comes from page context / conversation / query, not a topbar picker.

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

**Overlay vs side panel (2026-08-11):** Flyout must not render `AssistantPanel` beside the chat (squeezes ~32rem sheet). Open `uiLayout.panel` blocks fold into the message via `mergeUiLayoutBlocksWithPanel` / `messageUiBlocksForSurface(..., 'overlay')`. Expand workspace keeps the side column. Defense in depth: overlay clears `livePanel` on mount and CSS hides `.plexon-assistant-side-panel` under `[data-presentation='overlay']`.

Overlay must **not** `router.replace(/assistant?c=…)` on send — that jumps users out of the flyout onto the expand page (and hides the FAB). URL sync is expand-only; flyout keeps `conversationId` in React state + `onConversationChange`.

### First-turn remount (2026-09-24)

Expand used to `router.replace(?c=…)` inside `ensureConversation` **before** the stream finished. App Router soft-nav remounted `AssistantChat` / Suspense and the first reply vanished (user had to send again). Fix: `history.replaceState` only for expand URL sync; defer URL write until after create; `sendInFlightRef` blocks history/`openConversation` wipe mid-turn. Spec: `specs/domain/central-assistant-flyout.md` § First-turn continuity.

### Single conversation create (2026-09-25)

Client no longer `POST`s a conversation before the first stream. Complete omits `conversationId` on turn 1; server mints via `resolveAssistantConversationForComplete`. Unknown provided ids → **404** (no silent second row). `POST /api/assistant/conversations` stays for explicit create (history/ops).

### Stream continuity follow-ups (2026-09-24)

- `token_reset` clears draft tokens **in place** (`clearStreamingAssistantContent`) — no bubble wipe.
- After `done`, finalize locally (`finalizeStreamingAssistantMessage`) and **soft-refresh** the transcript (stable React keys + `serverMessageId` for pins) instead of awaiting a hard `loadConversation` that could flash empty.
- Helpers: `lib/assistant/stream-continuity.ts`.

### Stop / busy feedback / streaming plain text (2026-09-25)

- Composer **Stop** aborts SSE via `AbortController` (`postAssistantCompleteStream` signal); partial answer stays.
- Mid-flight send/attach no longer silent — short Field error hint.
- While `metadata.streaming`, `AssistantChatAnswer` renders plain pre-wrap; markdown parse only after complete.

### Activity + answer chrome (follow-up)

- `AgentActivityTrace` / `PlannerStepCard`: `Panel variant="default"` — never `data-msqdx-surface="light"` inside the flyout.
- Cream paper override stays scoped to `[data-plexon-content]` only; assistant chat remaps any residual light surfaces to `var(--panel)` / `var(--ink)`.
- Assistant answers render via `AssistantChatAnswer` + `lib/assistant/format-chat-answer.ts` (Audion SoT) into DS `.chat-answer-*` blocks — not raw pre-wrap markdown.
- Formatter supports headings, lists, bold/italic, inline+fenced code, links, quotes, **GFM pipe tables** (`.chat-answer-table`); recovers tables flattened onto one line; bare section titles between blank lines; strips emoji/emoticons from assistant copy. Pin control uses text labels (no star glyphs).

### Wave 7 generative UI (2026-08-10)

Block chrome in the flyout/expand turns uses `@msqdx/ui` only: `UiBlockSurface` → `Panel`, `step_list` → `.plexon-assistant-steps` + `Spinner`, pin shell → `.plexon-assistant-block`. Spec: `specs/domain/ui-migrate-assistant.md`.

### Page context (2026-08-10)

EQC pages publish `AssistantPageContext` (capability + `workflowRunId`) into the flyout; complete hydrates an authorized run into the system prompt. Spec: `specs/domain/assistant-page-context.md`.

System prompt includes a compact **Plattform-Navigation** block from `lib/assistant/platform-navigation.ts` (constants only; no invented links). Spec: `specs/domain/assistant-platform-navigation.md`.
