# UI rebuild — reuse from Audion / `@msqdx/ui`

**Status:** Living — 2026-07-31  
**Companion:** `specs/domain/ui-migrate.md`

Plexon v3 must **compose** shared chrome, not fork a second design language.

## Import from `@msqdx/ui` (always)

| Need | Export |
|------|--------|
| Shell | `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `MsqdxLogoMark`, `shellFrameStyle` |
| Magazine | `SectionChrome`, `Panel`, `Text`, `Lede`, `RankedList` |
| Forms | `Field`, `Input`, `Textarea`, `Select`, `Switch`, `ToggleGroup`, `Checkbox` |
| Actions / feedback | `Button`, `Chip`, `Alert`, `Dialog`, `Spinner`, `EmptyState`, `LoadingText` |
| Overlays | `Flyout`, `useFlyout`, **`ChatOverlay`** (dock-end / center flyout shell) |
| Chat icons | `IconSend`, `IconShare`, `IconHistory`, … |
| Chat CSS | classes in `styles.css` / `chat.css` — `.chat-overlay`, `.chat-panel-compact`, `.chat-panel-open`, `.chat-turns`, `.chat-composer`, `.chat-send`, … |

`ChatOverlay` is the shared React shell for the **central assistant flyout** (domain-free slots). Turn/composer **domain** logic stays product-owned (Plexon orchestrator). Primary Assistant IA = flyout; `/assistant` = expand — see `specs/domain/central-assistant-flyout.md`.

## Mirror from `audion-v3` (pattern, not npm import)

| Pattern | Audion path | Plexon use |
|---------|-------------|------------|
| App shell composition | `apps/web/components/app-shell.tsx` | Already aligned + `PlatformAssistantHost` |
| Chat workspace | `components/audion-chat-workspace.tsx` | Assistant Wave 5 / expand |
| Chat panel (turns + composer) | `components/audion-chat-panel.tsx` | Assistant Wave 5 |
| Chat history / share flyouts | `chat-*-flyout.tsx` | Assistant |
| Settings page | `settings-page.tsx` / `app/settings` | Settings Wave 2 |
| Specs | `specs/domain/chat-workspace.md`, `settings.md` | Read before Wave 2/5 |

## Do not

- Invent a second chat layout for Plexon Assistant.
- Merge Audion persona `/chat` into the platform Assistant flyout.
- Reintroduce MUI or grow the bridge for convenience.
- Port legacy “glass chat” / `@msqdx/react` bubbles when Audion chat chrome exists.
- Copy Audion product CSS blindly (`.audion-magazine*`) — reuse **structure + DS classes**, brand as Plexon.
- Hardcode Plexon/product URLs in host mounts.
