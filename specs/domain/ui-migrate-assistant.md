# UI rebuild — Assistant

**Status:** Accepted — Wave 5 shell done — 2026-07-31; Flyout-primary — 2026-08-10; **Wave 7 generative UI → `@msqdx/ui` — 2026-08-10**  
**Route:** `/assistant*` (expand) · `/assistant/embed` (flyout iframe)  
**Layout:** **Primary** = dock-end `ChatOverlay` flyout (`presentation: 'overlay'`). **Secondary** = full-height expand workstation (`presentation: 'expand'`) inside AppShell.  
**Reference:** `specs/domain/central-assistant-flyout.md` · `audion-v3` chat workspace/panel · `@msqdx/ui` `ChatOverlay` / `chat.css` · `knowledge/ui-rebuild-reuse.md` · `knowledge/plexon-assistant-generative-ui.md`  
**Product model:** `specs/domain/collection-projects.md` — Collections only (`platformProjectId`)

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Conversations / send / stream | **keep** | Orchestrator + APIs stay |
| Chat chrome (turns, composer, send) | **reshape** | DS `.chat-panel` / `.chat-turns` / `.chat-form` / `.chat-composer` / `.chat-send` |
| History | **reshape** | `Flyout` + `IconHistory` + `SectionChrome` (Audion pattern); drop MUI Drawer sidebar |
| Project context picker | **drop** (UI) | Binding remains via page context / conversation / query; no topbar Select |
| Generative UI blocks / reports | **reshape** (Wave 7) | All `components/assistant-ui/**` on `@msqdx/ui`; **drop** MUI / `@msqdx/react` in message path |
| Glass bubbles / MsqdxTypography chat | **drop** | `.chat-turn` + Text |
| PlexonPageChrome / AppHeaderV2 on assistant | **drop** | AppShell title is enough |
| Capabilities overview table | **reshape** | `@msqdx/ui` Panel/Text — no MUI |
| Full-page as primary entry | **reshape** | Flyout primary; `/assistant` = expand of same conversation (`central-assistant-flyout.md`) |
| Cross-app host | **keep** (new) | Embed iframe + `PlatformAssistantHost` in all v3 shells |
| MUI Stepper / light paper cards in turns | **drop** | Vertical `.plexon-assistant-steps` + `Panel variant="default"` |

## Reuse map

| Piece | Source |
|-------|--------|
| Overlay shell | `@msqdx/ui` `ChatOverlay` |
| CSS | `@msqdx/ui` `chat.css` via `styles.css` |
| Composer | `Field` + `Textarea` + `Button` + `IconSend` |
| History | `Flyout` + `IconHistory` + `SectionChrome` |
| Empty | `EmptyState` |
| Collection binding | pageContext / conversation / `?platformProjectId=` (no topbar picker) |
| Block chrome | `Panel` + `Text` + `.plexon-assistant-block*` |
| Block list typography | `UiText` → DS roles: panel title `title@xl`, item title `title@lg`, prose `meta` (`knowledge/assistant-block-typography.md`) |
| Step progress | `.plexon-assistant-steps` + `Spinner` (Audion-like status rows) |
| Markdown blocks | `AssistantChatAnswer` / `format-chat-answer` |

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

## File set (Wave 7 generative UI)

- `components/assistant-ui/**` (atoms, molecules, organisms, templates, `AssistantBlockRenderer`, `AssistantPanel`)
- `components/assistant/ReportPinButton.tsx`
- `components/assistant/AssistantCapabilitiesOverview.tsx`
- `components/assistant/AssistantChatAnswer.tsx`
- `lib/assistant/format-chat-answer.ts`

## Acceptance

1. Assistant shell uses Audion/DS chat chrome classes. ✅
2. Zero `@mui` / `@msqdx/react` in Wave 5 shell file set above. ✅
3. Zero `@mui` / `@msqdx/react` in Wave 7 generative UI file set. ✅
4. Send / history / Collection picker / stream still work.
5. Flyout is primary entry; expand continues the same `conversationId` (`central-assistant-flyout.md`).
6. `step_list` renders `.plexon-assistant-steps` (not bridge Stepper / cream paper).
7. No `data-msqdx-surface="light"` forced on assistant block chrome.
