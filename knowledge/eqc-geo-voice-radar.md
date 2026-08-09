# EQC GEO — Share-of-voice spider

**Date:** 2026-08-09  
**Pattern:** EchoN briefing `ScoreRadarChart` (SVG polar, no Recharts)

## Where

- Magazine GEO chapter → Wettbewerbsanalyse → Share of voice
- List (`plexon-eqc-geo-voice__race`) stays primary; spider sits beside it
- Component: `components/event-quick-check/EventQuickCheckVoiceRadar.tsx`
- Geometry: `lib/assistant/reports/event-quick-check/eqc-radar-geometry.ts`

## Rules

- Axes = top competitors by share % (max 6, min 3 — else hide spider)
- Value = share of voice 0–100 → radius 0–1
- Own domain marked (`· du` label + highlight dot)
- Ranked HTML race list remains for precise % / mentions / Ø position

## Non-goals

Not a shared `@msqdx/ui` primitive (product/domain chart). EEAT multi-axis spider can reuse the same geometry later.
