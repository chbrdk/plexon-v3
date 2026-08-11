# Assistant generative UI — typography density

Stand: 2026-08-11  
Spec: `specs/domain/ui-migrate-assistant.md`

## Problem

Finding / recommendation rows used legacy `UiText variant="subtitle2"` → full DS `title` (`--type-2xl`). In the flyout that read like magazine headlines. Body defaulted to `--type-xl`.

## Contract (chat / block lists)

| Surface | DS Text | Size |
|---------|----------|------|
| Block panel title | `title` | `xl` |
| List item headline | `title` | `lg` |
| List item prose | `meta` | default |
| Captions / hints | `hint` | default |

Plexon bridge: `components/assistant-ui/atoms/UiText.tsx` via `resolveUiTextTypography`.  
DS primitives: `ChatBlockPanel` + `ChatBlockList` (`@msqdx/ui`).

## What is in `@msqdx/ui` / Storybook vs product

| Piece | Location | Storybook |
|-------|----------|-----------|
| Chat overlay shell | `@msqdx/ui` `ChatOverlay` | `Organisms/ChatOverlay` |
| Chat CSS chrome | `@msqdx/ui` `chat.css` | via ChatOverlay + catalog |
| `Text` roles | `@msqdx/ui` | Typography |
| Message blocks | `@msqdx/ui` `ChatBlockPanel` / `ChatBlockList` | **`Organisms/Chat/Catalog`** · Molecules/ChatBlock* |
| Stream / report schema wiring | **Plexon** `components/assistant-ui/**` | product |

Staging Storybook: `https://ds.projects-a.plygrnd.tech/?path=/story/organisms-chatcatalog--inventory` (`URL_MSQDX_UI_STORYBOOK`).
Message blocks: `@msqdx/ui` `ChatBlockPanel` / `ChatBlockList` · Storybook **`Organisms/ChatCatalog`** · Molecules/ChatBlock*
