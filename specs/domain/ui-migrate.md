# UI rebuild — `@msqdx/ui` (challenge + reuse)

**Status:** Accepted — 2026-07-31  
**Knowledge:** `knowledge/ui-rebuild-msqdx-ui.md` · `knowledge/ui-rebuild-reuse.md`  
**Target DS:** `@msqdx/ui` + `@msqdx/ui-tokens` (sibling `msqdx-ui`)  
**Reference product:** `audion-v3` (composition patterns, chat workspace)  
**Product model:** `specs/domain/collection-projects.md` (Collection = one project; capabilities = CHECKION/AUDION)  
**Not:** real MUI · not `@msqdx/react` · not “skin the old screen”

## Goal

Rebuild each Plexon surface cleanly on `@msqdx/ui`, keep required **capability**, and drop or redesign anything that is outdated — then delete temporary bridges.

This is **not** a 1:1 visual migration of legacy JSX.

## Principles (non-negotiable)

1. **Challenge first.** Before coding a wave: list current capabilities → keep / reshape / drop. Prefer modern UX and tech (federation v3, DS chat chrome, Field system, etc.) over porting old patterns.
2. **Reuse before invent.** Prefer `@msqdx/ui` primitives and **Audion composition patterns** (chat panel/workspace, settings bands, SectionChrome magazines). Do not invent a second chat UI, second settings chrome, or app-local DS clones.
3. **Capability ≠ chrome.** Backend contracts (NextAuth, Drizzle, federation APIs, assistant orchestrator, EQC workflows) stay unless a wave explicitly redesigns them. UI chrome can be rewritten.
4. **Specs first.** Update the wave spec with keep/reshape/drop + reuse map before implementation.
5. **No bridge expansion.** Do not grow `mui-shim` / `@msqdx/react` bridge for new work.

## Wave order

| Wave | Spec | Route(s) | Rebuild posture |
|------|------|----------|-----------------|
| 0 | `app-shell.md` + auth | shell · auth | Done — magazine shell + auth on `@msqdx/ui` |
| 1 | `ui-migrate-dashboard.md` | `/` | Partial — adapters; **revisit** for challenge pass |
| 2 | `ui-migrate-settings.md` | `/settings` | Rebuild like Audion settings (Field / ToggleGroup) |
| 3 | `ui-migrate-products.md` | `/products` · `/projects/[id]` | Done — catalog + project detail |
| 4 | `ui-migrate-admin.md` | `/admin*` | Done — tables/forms on DS |
| 5 | `ui-migrate-assistant.md` | `/assistant*` | **Compose Audion chat chrome** — Collection project language |
| 6 | `ui-migrate-event-quick-check.md` | `/event-quick-check*` | Rebuild workflow UI; keep scan/report contracts |
| 7 | `ui-migrate-board.md` | `/board*` | Board chrome on DS; isolate Prismion; remove bridges |

## Reuse map (default)

| Need | Source |
|------|--------|
| Primitives, shell, SectionChrome, Field, Flyout, icons | `@msqdx/ui` |
| Chat CSS chrome (`.chat-panel`, `.chat-composer`, …) | `@msqdx/ui/styles.css` (`chat.css`) |
| Chat composition | Mirror `audion-v3` `AudionChatPanel` / `AudionChatWorkspace` |
| Settings bands | Mirror `audion-v3` settings page (SectionChrome + Field + ToggleGroup) |
| Magazine bands | `SectionChrome` + Audion magazine layout patterns |

## Temporary bridges (delete in Wave 7)

| Alias | File | Purpose |
|-------|------|---------|
| `@msqdx/react` | `lib/msqdx-react-bridge/` | Legacy until cutover |
| `@mui/material` | `lib/mui-shim.tsx` | Stub only |
| `@msqdx/tokens` | legacy tokens | Board Prismion only |

## Agent checklist per wave

1. Read this index + the wave spec.
2. Write/update **keep / reshape / drop** and **reuse map** in the wave spec.
3. Implement on `@msqdx/ui` (+ Audion patterns). No new MUI/`@msqdx/react`.
4. Preserve required APIs unless the wave explicitly changes them.
5. Smoke tests + update `knowledge/ui-rebuild-msqdx-ui.md`.
