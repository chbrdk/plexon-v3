# EQC → Persona chat (Audion SoT + overlay)

**Status:** Spec locked 2026-08-11 — **overlay + guest budgets**  
**SoT:** `specs/domain/eqc-as-collection-flow.md` § Persona talk · `specs/domain/capability-catalog.md` Wave C5 · `specs/domain/ui-migrate-event-quick-check.md` § Next slice  
**Audion embed:** `audion-v3/specs/domain/chat-embed.md`  
**URL helpers:** `resolveEqcPersonaChatHref` (full `/chat`) · `resolveEqcPersonaChatEmbedHref` (`/chat/embed`) · `buildAudionChatUrl` / `buildAudionAppUrl`  
**Product chat:** Audion remains SoT — Plexon hosts `ChatOverlay` + iframe only

## Decision

| Do | Don't |
|----|-------|
| EQC magazine + public share CTA → `ChatOverlay` + iframe Audion `/chat/embed?…` | Rebuild Audion chat inside Plexon |
| Guest budgets on unauthenticated stream (5 turns / ~800 chars / 30 min TTL) | Unlimited public sessions |
| Fallback deep-link **„In Audion öffnen“** → full `/chat?personaId=&projectId=` | Drop deep-link when framing fails |
| Central Assistant: orchestrate + optional short MCP `audion_chat` | Merge Audion `/chat` into Platform Assistant |

## Why

Audion owns persona system prompts, TG mode, conversation resume, and share. The overlay reuses the same SoT via iframe (mirror `PlatformAssistantHost`). Guest budgets keep public share sessions finite.

## Surfaces

1. Authenticated EQC magazine (`EventQuickCheckDashboardView`)
2. Public Quick Check share `/share/quick-check/[token]` (same dashboard, `readOnly`)

## Implement checklist (C5 overlay)

1. [x] Magazine CTA **„Mit Persona sprechen“** opens overlay (`data-testid=eqc-persona-chat-cta`)
2. [x] Embed href via `resolveEqcPersonaChatEmbedHref` → Audion `/chat/embed?personaId=&projectId=&embed=1|full` (+ optional `theme`); logged-in EQC uses `embed=full` (Tavus + inspect)
3. [x] Secondary / header action **„In Audion öffnen“** → `resolveEqcPersonaChatHref` deep-link
4. [x] Hide CTA when `persona.id` or Audion `projectId` missing
5. [x] Guest budget constants documented (Audion `guest-budget.ts` + paths knowledge)
6. [ ] Optional: Assistant chip after EQC context
7. [ ] Optional: register `audion.persona_chat` in `lib/capabilities/catalog.ts` (Agent-only stub → MCP)

**Implements:** `lib/assistant/event-quick-check/eqc-persona-chat-href.ts` · `components/event-quick-check/EqcPersonaChatOverlay.tsx` · `EventQuickCheckDashboardView` · Audion `/chat/embed` + guest stream gate

## Smoke

1. Open public `/share/quick-check/…` (or logged-in EQC magazine) with personas + `audionProjectId`.
2. CTA → dock-end overlay with Audion iframe; chat works without Plexon login.
3. After 5 guest turns, send blocked in UI; further `POST /api/chat/stream` rejected.
4. **In Audion öffnen** still opens full `/chat` deep-link.
5. Platform FAB still orchestrates; does not replace persona chat.
