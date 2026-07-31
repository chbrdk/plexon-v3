# UI rebuild — reuse from Audion / `@msqdx/ui`

**Status:** Living — 2026-07-31  
**Companion:** `specs/domain/ui-migrate.md`

Plexon v3 must **compose** shared chrome, not fork a second design language.

## Import from `@msqdx/ui` (always)

| Need | Export |
|------|--------|
| Shell | `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `MsqdxLogoMark`, `shellFrameStyle` |
| Magazine | `SectionChrome`, `Panel`, `Text`, `StatLede`, `RankedList` |
| Forms | `Field`, `Input`, `Textarea`, `Select`, `Switch`, `ToggleGroup`, `Checkbox` |
| Actions / feedback | `Button`, `Chip`, `Alert`, `Dialog`, `Spinner`, `EmptyState`, `LoadingText` |
| Overlays | `Flyout`, `useFlyout` |
| Chat icons | `IconSend`, `IconShare`, `IconHistory`, … |
| Chat CSS | classes in `styles.css` / `chat.css` — `.chat-panel-open`, `.chat-turns`, `.chat-composer`, `.chat-send`, … |

There is **no** React `ChatPanel` package yet — compose with CSS chrome + primitives (same as Audion).

## Mirror from `audion-v3` (pattern, not npm import)

| Pattern | Audion path | Plexon use |
|---------|-------------|------------|
| App shell composition | `apps/web/components/app-shell.tsx` | Already aligned |
| Chat workspace | `components/audion-chat-workspace.tsx` | Assistant Wave 5 |
| Chat panel (turns + composer) | `components/audion-chat-panel.tsx` | Assistant Wave 5 |
| Chat history / share flyouts | `chat-*-flyout.tsx` | Assistant |
| Settings page | `settings-page.tsx` / `app/settings` | Settings Wave 2 |
| Specs | `specs/domain/chat-workspace.md`, `settings.md` | Read before Wave 2/5 |

## Do not

- Invent a second chat layout for Plexon Assistant.
- Reintroduce MUI or grow the bridge for convenience.
- Port legacy “glass chat” / `@msqdx/react` bubbles when Audion chat chrome exists.
- Copy Audion product CSS blindly (`.audion-magazine*`) — reuse **structure + DS classes**, brand as Plexon.
