# Assistant generative UI — typography density

Stand: 2026-08-11  
Spec: `specs/domain/ui-migrate-assistant.md`

## Problem

Finding / recommendation rows used legacy `UiText variant="subtitle2"` → full DS `title` (`--type-2xl`). In the flyout that read like magazine headlines. Body defaulted to `--type-xl`.

## Contract (chat / block lists)

| Surface | DS Text | Size |
|---------|----------|------|
| Block panel title (`UiBlockHeader`) | `title` | `xl` |
| List item headline (finding / rec title) | `title` | `lg` |
| List item prose (description) | `meta` | default |
| Captions / hints | `hint` | default |

Mapped in `components/assistant-ui/atoms/UiText.tsx` via `resolveUiTextTypography`.

## What is in `@msqdx/ui` / Storybook vs product

| Piece | Location | Storybook |
|-------|----------|-----------|
| Chat overlay shell | `@msqdx/ui` `ChatOverlay` | `Organisms/ChatOverlay` |
| Chat CSS chrome (turns, composer, compact panel) | `@msqdx/ui` `chat.css` | via ChatOverlay + chat chrome docs |
| `Text` roles | `@msqdx/ui` | Design System → Typography |
| Generative message blocks (`UiFindingList`, `UiRecommendationList`, `UiBlockSurface`, …) | **Plexon** `components/assistant-ui/**` | **not** in msqdx-ui Storybook (product domain) |

Spec non-goal (msqdx-ui chat chrome): shared React message-domain `ChatPanel` / MessageList stays product-owned.
