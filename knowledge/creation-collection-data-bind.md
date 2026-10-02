# CREATION Collection data bind

**Date:** 2026-10-02 · **Status:** Wave 1.2  
**CREATION SSOT:** `creation-v3/specs/domain/collection-data-bind.md`  
**Related:** Collection capability surfaces · Magcloud pitch handoff (layout in CREATION)

## Role

Plexon Collections expose CHECKION / METRON (and later other) capability truth. CREATION magazines and slides **bind refs**, not copy numbers into scene JSON. Magcloud remains the pitch surface after PNG publish — live bind is editor/canvas time in CREATION.

## Chart studio (Wave 1.4)

SiteChart picks any accessible **Collection**, then a source (`metron.collection.kpis`, scan scores, history, …). Cross-Collection refs use `collection.{uuid}.{localRef}`. Field map paints label / value / color.

## Operator note

CREATION Coolify needs `METRON_API_URL` + `CHECKION_API_URL` (or public URL fallbacks) plus shared `PLEXON_SERVICE_SECRET` for live catalog/resolve. Without them, CREATION serves a fixture catalog so Inspect UX still works locally.
