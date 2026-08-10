# Central Assistant Flyout — architecture

Stand: 2026-08-10

## Summary

Cross-app **platform Assistant** as a dock-end chat flyout. Plexon owns the brain and embed surface; every v3 AppShell mounts a thin host. Audion persona `/chat` stays separate.

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
| `pathAssistantEmbed(...)` | embed + query |
| `pathAssistantChat(id)` | expand + `?c=` |

See `knowledge/paths.md`.

## Rollout

1. `@msqdx/ui` `ChatOverlay` organism.
2. Plexon embed + FAB + presentation modes.
3. Hosts in Audion / Checkion / Brandion AppShells.
4. Contract + shell smoke tests.

## Host checklist

- [ ] FAB in authenticated AppShell
- [ ] `ChatOverlay` dock-end
- [ ] iframe `src` from runtime-config Plexon base + `PATH_ASSISTANT_EMBED`
- [ ] postMessage origin checks
- [ ] Expand opens Plexon `/assistant?c=…`
- [ ] No hardcoded URLs

## Smoke

1. Open FAB in each product → embed loads.
2. Send a short message → stream responds.
3. “Open workspace” → same conversation on `/assistant?c=`.
4. With Collection id in host → embed query includes `project=`.
