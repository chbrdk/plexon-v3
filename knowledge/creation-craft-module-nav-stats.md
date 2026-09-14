# Craft modules: Nav Chrome + Stats Metrics

**Date:** 2026-09-14  
**Code:** `lib/assistant/creation-craft-modules.ts`  
**Ids:** `nav_chrome_v1` · `stats_metrics_v1`  
**Roadmap:** `knowledge/creation-craft-spirion-section-modules.md`

## Nav (`nav_chrome_v1`)

Triggers: Nav, Navigation, Header, Menüleiste, top-nav, navbar, …  
Pattern: logo + 2–5 links + optional primary CTA; prefer in-page anchors on conversion landings; no mega-IA / exit ramps unless wireframe demands it.  
2026 craft note: dedicated conversion pages stay chrome-light; homepage/wireframe may keep a slim bar.

## Stats (`stats_metrics_v1`)

Triggers: Stats, Metrics, KPI, Zahlenband, Kennzahlen, key figures, …  
Pattern: 3–4 metrics in one `SiteGrid`/row; number+label as **one** text shape each; concrete figures (no „XX%“).  
Not a substitute for equal three-up feature cards.

## Compose

Order after Spirion/wireframe: nav → stats → … (max 3). Example: `spirion_section_ref_v1` + `nav_chrome_v1` + `stats_metrics_v1`.

## Eval briefs

`de-nav-39`, `en-nav-40`, `de-stats-41`, `en-stats-42` · existing `de-landing-21` also hits stats.
