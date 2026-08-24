# Assistant embed API / host protocol

**Status:** Accepted — 2026-08-10 (hybrid + theme)  
**Domain:** `specs/domain/central-assistant-flyout.md`  
**Implements:** `PATH_ASSISTANT_EMBED` · `lib/assistant/embed-protocol.ts` · `app/assistant/embed/page.tsx` · `lib/paths/assistant-embed.ts`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`

## Embed URL

| Item | Value |
|------|--------|
| Path | `/assistant/embed` |
| Constant | `PATH_ASSISTANT_EMBED` |
| Builder | `pathAssistantEmbed(query)` |

Full URL for product hosts: `{PLEXON_PUBLIC_URL}{PATH_ASSISTANT_EMBED}?…`  
Plexon public base: host runtime-config / env (e.g. `NEXT_PUBLIC_PLEXON_URL`) — never hardcode.

**Hybrid note:** Same-origin Plexon hosts MUST NOT load this URL in an iframe; they mount `AssistantChat` in-process. Embed is for cross-app delivery only.

## Query contract

| Param | Constant / key | Required | Meaning |
|-------|----------------|----------|---------|
| `product` | `ASSISTANT_EMBED_PRODUCT_QUERY_PARAM` | yes | Host product id: `plexon` \| `audion` \| `checkion` \| `brandion` \| `creation` |
| `project` | `ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM` | no | Collection `platformProjectId` |
| `c` | `ASSISTANT_CONVERSATION_QUERY_PARAM` | no | Resume conversation |
| `capability` | `ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM` | no | Host capability hint (e.g. `scan`, `guidelines`) |
| `pathname` | `ASSISTANT_EMBED_PATHNAME_QUERY_PARAM` | no | Host pathname for help context |
| `theme` | `ASSISTANT_EMBED_THEME_QUERY_PARAM` | no | Host `data-theme` id for initial paint (allowlisted) |

Unknown params are ignored. Invalid `product` → embed still loads with `product=unknown` and logs a client warning.  
Invalid / unknown `theme` → ignore; keep document default theme.

## Auth

- Embed uses the same Plexon session cookie / SSO as `/assistant`.
- Staging assumption: shared parent domain / SSO so cross-origin iframe can send cookies (`SameSite=None; Secure` where required).
- If unauthenticated: embed posts `assistant:auth-required` and shows a quiet login CTA linking to Plexon login (path from constants).

## Theme sync

1. Host reads `document.documentElement.getAttribute('data-theme')` when opening the flyout and when theme changes (prefs / MutationObserver).
2. Host passes `theme` on the embed URL **and** posts `assistant:theme` while the overlay is open.
3. Embed applies allowlisted theme ids via `document.documentElement.setAttribute('data-theme', themeId)`.
4. Allowlist = theme ids shipped by `@msqdx/ui` / product shells (e.g. `msqdx-dark`, `light`, product defaults) — reject arbitrary strings.

## postMessage protocol

Channel marker: every message is a JSON-serializable object with `source: 'plexon-assistant-embed'` (embed→host) or `source: 'plexon-assistant-host'` (host→embed) and `type` string.

### Embed → host

| `type` | Payload | When |
|--------|---------|------|
| `assistant:ready` | `{ conversationId?: string }` | Embed chat mounted |
| `assistant:close` | `{}` | User closed from inside embed |
| `assistant:expand` | `{ conversationId?: string; project?: string }` | “Open workspace” — host should navigate or `window.open` expand URL |
| `assistant:auth-required` | `{ loginPath: string }` | Session missing |
| `assistant:conversation` | `{ conversationId: string }` | Conversation id assigned/changed |

### Host → embed

| `type` | Payload | When |
|--------|---------|------|
| `assistant:context` | `{ product; platformProjectId?; capability?; pathname?; entityType?; entityId?; entityUpdatedAt? }` | Host context changed while open |
| `assistant:theme` | `{ themeId: string }` | Host theme changed / initial sync |
| `assistant:close` | `{}` | Host requests embed to shut down UI (optional) |

`pageContext` on `POST /api/assistant/complete` (and stream) mirrors the same fields — see `specs/domain/assistant-page-context.md`.

`targetOrigin` MUST be the configured Plexon origin (embed) / host origin (host) — never `*`.

## Expand deep link

Host on `assistant:expand` builds:

`{PLEXON_PUBLIC_URL}{pathAssistantChat(conversationId)}`  
and optionally appends `&project=` when Collection context is set.

Inside Plexon (same origin), prefer client navigation to `pathAssistantChat` / `pathAssistantWithProject` (also via `ChatOverlay` headerActions when native).

## Acceptance

1. Constants for path + query keys live in `lib/constants.ts` (or `lib/paths/assistant-embed.ts` re-exported), including `ASSISTANT_EMBED_THEME_QUERY_PARAM`.
2. Unit tests cover query builder + message type guards (incl. `assistant:theme`).
3. Embed page ignores non-protocol `message` events; theme allowlist rejects unknown ids.
4. Documented in `knowledge/paths.md` and `knowledge/central-assistant-flyout.md`.
