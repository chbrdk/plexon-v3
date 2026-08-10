# UI rebuild — Assistant

**Status:** Accepted — Wave 5 shell done — 2026-07-31 (challenge + reuse); Flyout-primary — 2026-08-10  
**Route:** `/assistant*` (expand) · `/assistant/embed` (flyout iframe)  
**Layout:** **Primary** = dock-end `ChatOverlay` flyout (`presentation: 'overlay'`). **Secondary** = full-height expand workstation (`presentation: 'expand'`) inside AppShell.  
**Reference:** `specs/domain/central-assistant-flyout.md` · `audion-v3` chat workspace/panel · `@msqdx/ui` `ChatOverlay` / `chat.css` · `knowledge/ui-rebuild-reuse.md`  
**Product model:** `specs/domain/collection-projects.md` — Collections only (`platformProjectId`)

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Conversations / send / stream | **keep** | Orchestrator + APIs stay |
| Chat chrome (turns, composer, send) | **reshape** | DS `.chat-panel` / `.chat-turns` / `.chat-form` / `.chat-composer` / `.chat-send` |
| History | **reshape** | `Flyout` + `IconHistory` + `SectionChrome` (Audion pattern); drop MUI Drawer sidebar |
| Project context picker | **keep** | Already `@msqdx/ui` Select |
| Generative UI blocks / reports | **keep** (capability) | Progressive: block chrome still may use bridge until follow-up; shell must be clean |
| Glass bubbles / MsqdxTypography chat | **drop** | `.chat-turn` + Text |
| PlexonPageChrome / AppHeaderV2 on assistant | **drop** | AppShell title is enough |
| Capabilities overview table | **challenge** | Keep if still routed; no new MUI |
| Full-page as primary entry | **reshape** | Flyout primary; `/assistant` = expand of same conversation (`central-assistant-flyout.md`) |
| Cross-app host | **keep** (new) | Embed iframe + `PlatformAssistantHost` in all v3 shells |

## Reuse map

| Piece | Source |
|-------|--------|
| Overlay shell | `@msqdx/ui` `ChatOverlay` |
| CSS | `@msqdx/ui` `chat.css` via `styles.css` |
| Composer | `Field` + `Textarea` + `Button` + `IconSend` |
| History | `Flyout` + `IconHistory` + `SectionChrome` |
| Empty | `EmptyState` |
| Project picker | existing `ProjectContextChip` |

## File set (Wave 5 shell + flyout)

- `app/assistant/page.tsx`
- `app/assistant/embed/page.tsx`
- `components/PlatformAssistantHost.tsx`
- `components/assistant/AssistantChat.tsx`
- `components/assistant/AssistantChatComposer.tsx`
- `components/assistant/AssistantMessageList.tsx`
- `components/assistant/AssistantConversationHistory.tsx`
- `components/assistant/AssistantFollowUpChips.tsx`
- `components/assistant/AssistantMessageContent.tsx`
- `components/assistant/ConfirmActionCard.tsx`
- `components/assistant/PlannerStepCard.tsx`
- `components/assistant/AgentActivityTrace.tsx`
- `components/assistant-ui/AssistantChatBubble.tsx`
- `lib/assistant/embed-protocol.ts`

## Acceptance

1. Assistant shell uses Audion/DS chat chrome classes. ✅
2. Zero `@mui` / `@msqdx/react` in Wave 5 shell file set above. ✅
3. Send / history / Collection picker / stream still work.
4. Progress Wave 5 → shell + inner chrome done; ReportCollectionBar / generative UI organisms / EQC reports still progressive.
5. Flyout is primary entry; expand continues the same `conversationId` (`central-assistant-flyout.md`).
