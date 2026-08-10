# Assistant platform navigation — compact system knowledge

**Status:** Accepted — 2026-08-10  
**Implements:** `lib/assistant/platform-navigation.ts` · injected via `lib/assistant/system-prompt.ts`  
**Related:** `knowledge/paths.md` · `lib/constants.ts` · `lib/assistant/ui-blocks/product-links.ts` · `specs/domain/assistant-page-context.md`

## Purpose

Give the central assistant a **small, code-sourced** map of canonical Plexon routes and product bases so answers can cite correct links without inventing URLs.

## Rules

1. **Source of truth** is `lib/constants.ts` / `lib/paths/*` (documented in `knowledge/paths.md`) — never hardcode FQDNs in call sites or the prompt builder beyond reading env helpers (`getCheckionUrl`, `getAudionAdminUrl`, `getBrandionUrl`).
2. **Budget:** keep the block under ~2 KB; only high-traffic surfaces.
3. **No invention:** the system prompt must tell the model to use only paths from this block, page/project context, tool results, or `product-links` UI blocks — never guess IDs or deep links.
4. **Relative Plexon paths** are preferred (work in-app and in flyout). Product apps may list configured base origins when set.
5. **Templates** for ID-bearing routes use `{platformProjectId}` / `{workflowRunId}` placeholders — fill only when IDs are known from context/tools.

## Payload (prompt section)

Heading: `Plattform-Navigation (kanonisch)`.

Include at least:

| Surface | Constant / helper |
|---------|-------------------|
| Home | `PATH_HOME` |
| Collections list | `PATH_PROJECTS` |
| Collection dashboard | `pathPlatformProjectDashboard('{platformProjectId}')` |
| Collection flows | `pathPlatformProjectFlows('{platformProjectId}')` |
| Event Quick Check | `PATH_EVENT_QUICK_CHECK` · `pathEventQuickCheckRun('{workflowRunId}')` |
| Assistant expand | `PATH_ASSISTANT` · `pathAssistantChat('{conversationId}')` |
| Settings | `PATH_SETTINGS` |
| Products catalog | `PATH_PRODUCTS` |

Optional when env configured: CHECKION / AUDION / BRANDION **base origins** (no invented deep paths beyond bases + documented launch patterns).

## Non-goals

- Dumping `knowledge/paths.md` or full API inventories into the prompt
- Teaching staging FQDNs as prose when env is empty
- Replacing tool-driven link blocks (`product-links.ts`)

## Acceptance

1. Spec exists; knowledge/paths indexes the module.  
2. `buildPlatformNavigationPromptBlock()` returns paths that equal the live constants.  
3. `buildAssistantSystemPrompt` contains the navigation heading and the no-invent rule.  
4. Unit test covers block contents + system prompt inclusion.
