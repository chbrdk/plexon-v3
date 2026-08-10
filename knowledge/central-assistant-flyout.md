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

## Smoke

1. Plexon FAB → native overlay (no iframe in DOM).
2. Product FAB → embed loads with matching theme.
3. Send a short message → stream responds.
4. “Open workspace” / header expand → same conversation on `/assistant?c=`.
5. With Collection id in host → embed query includes `project=`.
6. Toggle host light/dark → iframe theme updates.
