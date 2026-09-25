# EQC → Persona chat (Audion SoT + native overlay)

**Status:** Spec locked 2026-08-20 — **native overlay (Wave C6)**  
**SoT:** `specs/domain/eqc-as-collection-flow.md` § Persona talk · `specs/domain/capability-catalog.md` Wave C5/C6 · `specs/domain/ui-migrate-event-quick-check.md` § Next slice  
**Audion API:** `audion-v3/specs/domain/chat-embed.md` (guest budgets + public routes)  
**URL helpers:** `resolveEqcPersonaChatHref` (full `/chat` deep-link) · `buildAudionChatUrl` / `buildAudionAppUrl`  
**Product chat:** Audion remains API SoT — Plexon hosts native `ChatOverlay` + `PersonaChatWorkspace`

## Decision

| Do | Don't |
|----|-------|
| EQC magazine + public share CTA → `ChatOverlay` + native `PersonaChatWorkspace` | Rebuild Audion prompts/stream logic inside Plexon |
| Plexon BFF proxies → Audion `/api/chat/*` + `/api/share/personas/*` | Browser cross-origin calls to Audion (CORS/cookies) |
| Guest budgets on unauthenticated stream (5 turns / ~800 chars / 30 min TTL) | Unlimited public sessions |
| Fallback deep-link **„In Audion öffnen“** → full `/chat?personaId=&projectId=` | Drop deep-link when overlay fails |
| Central Assistant: orchestrate + optional short MCP `audion_chat` | Merge Audion `/chat` into Platform Assistant |
| Audion `/chat/embed` iframe | Primary EQC host (kept for optional guest/public fallback only) |

## Architecture (Wave C6)

```
ChatOverlay (@msqdx/ui)
  └── PersonaChatWorkspace (Plexon)
        → /api/capabilities/audion/* (BFF)
              → Audion platform /api/chat/stream | tavus | share | tool-call
```

Paths: `lib/paths/audion-chat-api.ts` · proxy: `lib/integrations/audion-platform-proxy.ts`

## Surfaces

1. Authenticated EQC magazine (`EventQuickCheckDashboardView`) — `guestEmbed={false}` → Tavus + inspect; **Mit Persona sprechen**, **In CHECKION/AUDION öffnen** + Anhang/Rohdaten visible
2. Public Quick Check share `/share/quick-check/[token]` — `readOnly`: magazine only; **no** persona chat CTA/overlay, **no** product deep-links (CHECKION/AUDION/ECHON), **no** appendix (Rohdaten & Schritte)

## Implement checklist

1. [x] Magazine CTA **„Mit Persona sprechen“** opens overlay (`data-testid=eqc-persona-chat-cta`) — **authenticated only** (hidden on public `readOnly` share)
2. [x] Native workspace loads persona via BFF `GET …/share/personas/[id]?projectId=`
3. [x] Stream via BFF `POST …/chat/stream` (guest session cookie on Plexon origin)
4. [x] Logged-in EQC: Tavus (`POST …/tavus/session`) + website inspect tool approval
5. [x] Secondary / header action **„In Audion öffnen“** → `resolveEqcPersonaChatHref` (**authenticated magazine only**; hidden on public `readOnly` share)
6. [x] Hide CTA when `persona.id` or Audion `projectId` missing
7. [x] Public share (`readOnly`): hide persona chat CTA, CHECKION/AUDION/ECHON product links + appendix Rohdaten
8. [x] Optional: Assistant chip after EQC context (`eqc-persona-chat` follow-up)
9. [x] Optional: register `audion.persona_chat` in `lib/capabilities/catalog.ts`

**Implements:** `components/persona-chat/*` · `components/event-quick-check/EqcPersonaChatOverlay.tsx` · `app/api/capabilities/audion/**`

## Smoke

1. Open public `/share/quick-check/…` (or logged-in EQC magazine) with personas + `audionProjectId`.
2. CTA → dock-end overlay with native chat; messages stream without Plexon→Audion iframe.
3. After 5 guest turns, send blocked in UI; further stream rejected.
4. Logged-in EQC: video toggle starts Tavus iframe inside overlay.
5. **In Audion öffnen** opens full `/chat` deep-link.
6. Platform FAB still orchestrates; does not replace persona chat.
7. Persona overlay: assistant bubble keeps a stable React key through `done` (no mid-answer remount); soft-filtered `done.text` applied in place.

## Stream continuity (2026-09-24)

`PersonaChatPanel` must not swap turn `id` to the server `messageId` on `done` — that remounts `key={turn.id}` and feels like a reset. Same pattern as Audion `audion-chat-panel` / `knowledge/chat-stream-continuity-2026-09-24.md`.
