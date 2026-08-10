# Assistant embed API / host protocol

**Status:** Accepted — 2026-08-10  
**Domain:** `specs/domain/central-assistant-flyout.md`  
**Implements:** `PATH_ASSISTANT_EMBED` · `lib/assistant/embed-protocol.ts` · `app/assistant/embed/page.tsx`  
**Knowledge:** `knowledge/central-assistant-flyout.md` · `knowledge/paths.md`

## Embed URL

| Item | Value |
|------|--------|
| Path | `/assistant/embed` |
| Constant | `PATH_ASSISTANT_EMBED` |
| Builder | `pathAssistantEmbed(query)` |

Full URL for product hosts: `{PLEXON_PUBLIC_URL}{PATH_ASSISTANT_EMBED}?…`  
Plexon public base: host runtime-config / env (e.g. `NEXT_PUBLIC_PLEXON_URL`) — never hardcode.

## Query contract

| Param | Constant / key | Required | Meaning |
|-------|----------------|----------|---------|
| `product` | `ASSISTANT_EMBED_PRODUCT_QUERY_PARAM` | yes | Host product id: `plexon` \| `audion` \| `checkion` \| `brandion` |
| `project` | `ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM` | no | Collection `platformProjectId` |
| `c` | `ASSISTANT_CONVERSATION_QUERY_PARAM` | no | Resume conversation |
| `capability` | `ASSISTANT_EMBED_CAPABILITY_QUERY_PARAM` | no | Host capability hint (e.g. `scan`, `guidelines`) |
| `pathname` | `ASSISTANT_EMBED_PATHNAME_QUERY_PARAM` | no | Host pathname for help context |

Unknown params are ignored. Invalid `product` → embed still loads with `product=unknown` and logs a client warning.

## Auth

- Embed uses the same Plexon session cookie / SSO as `/assistant`.
- Staging assumption: shared parent domain / SSO so cross-origin iframe can send cookies (`SameSite=None; Secure` where required).
- If unauthenticated: embed posts `assistant:auth-required` and shows a quiet login CTA linking to Plexon login (path from constants).

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
| `assistant:context` | `{ product; platformProjectId?; capability?; pathname? }` | Host context changed while open |
| `assistant:close` | `{}` | Host requests embed to shut down UI (optional) |

`targetOrigin` MUST be the configured Plexon origin (embed) / host origin (host) — never `*`.

## Expand deep link

Host on `assistant:expand` builds:

`{PLEXON_PUBLIC_URL}{pathAssistantChat(conversationId)}`  
and optionally appends `&project=` when Collection context is set.

Inside Plexon (same origin), prefer client navigation to `pathAssistantChat` / `pathAssistantWithProject`.

## Acceptance

1. Constants for path + query keys live in `lib/constants.ts` (or `lib/paths/assistant-embed.ts` re-exported).
2. Unit tests cover query builder + message type guards.
3. Embed page ignores non-protocol `message` events.
4. Documented in `knowledge/paths.md` and `knowledge/central-assistant-flyout.md`.
