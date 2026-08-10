# Assistant page context

**Status:** Accepted — 2026-08-10  
**Implements:** `lib/assistant/page-context.ts` · `components/assistant/AssistantPageContext.tsx` · hydrate EQC · complete body `pageContext`  
**API:** `specs/api/assistant-embed.md` (`assistant:context` + complete payload)  
**Flyout:** `specs/domain/central-assistant-flyout.md`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`

## Goal

The flyout assistant MUST know which host page/entity the user is viewing so questions like “fasse diesen Scan zusammen” work without re-pasting URLs.

## Payload

```ts
type AssistantPageContext = {
  product: 'plexon' | 'audion' | 'checkion' | 'brandion'
  pathname: string
  capability?: string // e.g. ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK
  platformProjectId?: string
  entityType?: 'event_quick_check_run'
  entityId?: string // workflowRunId for EQC
}
```

Constants: `lib/assistant/page-context.ts` (capability / entityType ids). Never hardcode capability strings in call sites.

## Publishing (Plexon native)

1. React context provider wraps AppShell content.
2. Pages publish via `useSetAssistantPageContext` (EQC publishes `workflowRunId` + `platformProjectId`).
3. `PlatformAssistantHost` merges React context with URL fallback (`/event-quick-check?run=`).
4. Native `AssistantChat` receives `pageContext` and sends it on every complete/stream request.
5. When `platformProjectId` is set and the conversation has no project yet, seed the Collection picker.

## Embed / products

`assistant:context` MAY include the same fields (`capability`, `pathname`, `platformProjectId`, `entityType`, `entityId`). Embed page applies them into `AssistantChat`. Cross-product entity hydrate beyond EQC is deferred.

## Complete API

`AssistantCompleteBody.pageContext?: AssistantPageContext`

Server:

1. Validate shape (ignore unknown fields).
2. Prefer `pageContext.platformProjectId` for Collection binding when authorized (same as body/conversation).
3. If `capability === event_quick_check` and `entityType === event_quick_check_run` and `entityId` set → hydrate run (authz via `userCanAccessEventQuickCheckRun`).
4. Append compact block to system prompt: `## Aktueller Seitenkontext — Event Quick Check`.
5. On hydrate failure (missing/forbidden): keep a thin route hint only (pathname + capability).

## Hydration budget

EQC compact block ≤ `ASSISTANT_MAX_PAGE_CONTEXT_CHARS` (page-context module; default 6_000). Include run id, status, URL/domain, Collection ids, KPI tiles, top findings/recommendations teasers — not full report JSON.

## Acceptance

1. On `/event-quick-check?run={id}` with open flyout, complete requests include `pageContext.entityId`.
2. Authorized users get EQC block in system prompt for free_chat turns.
3. Unauthorized / unknown run → no leak of run contents.
4. Specs inventory + unit/contract tests green.
