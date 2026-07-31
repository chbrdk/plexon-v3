# UI rebuild — Assistant

**Status:** Draft — Wave 5 (challenge + reuse)  
**Route:** `/assistant*`  
**Layout:** full-height workstation  
**Reference:** `audion-v3` chat workspace/panel · `@msqdx/ui` chat CSS · `knowledge/ui-rebuild-reuse.md`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Conversations / send / stream | **keep** | Orchestrator + APIs stay |
| Chat chrome (turns, composer, send) | **reshape** | **Compose Audion chat chrome** — do not invent Plexon-only chat UI |
| History / share flyouts | **reshape** | `Flyout` + Audion flyout pattern |
| Generative UI blocks / reports | **keep** (capability) | Rebuild block chrome on Panel/Text; challenge redundant organisms |
| Legacy glass bubbles / MsqdxTypography chat | **drop** | Replace with `.chat-*` DS classes |
| Duplicate “capabilities overview” tables if obsolete | **challenge** | Drop or move to docs if unused |

## Reuse map

| Piece | Source |
|-------|--------|
| CSS | `@msqdx/ui` `chat.css` via globals |
| Composer | `Field` + `Textarea` + `Button`/`IconSend` + `.chat-composer` / `.chat-send` |
| Panel structure | Mirror `AudionChatPanel` markup |
| Workspace chrome | Mirror `AudionChatWorkspace` (topbar actions, flyouts) |
| Specs to read | `audion-v3/specs/domain/chat-workspace.md` |

## Non-goals

- New chat visual language unique to Plexon.
- Expanding MUI bridge to keep old bubbles.

## Acceptance

1. Assistant visually/structurally aligned with Audion chat chrome.
2. Zero legacy DS imports in assistant file set.
3. Send / history / report flows still work.
4. Progress Wave 5 → done.
