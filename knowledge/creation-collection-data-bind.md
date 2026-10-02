# CREATION Collection data bind

**Date:** 2026-10-02 · **Status:** Wave 1.2  
**CREATION SSOT:** `creation-v3/specs/domain/collection-data-bind.md`  
**Related:** Collection capability surfaces · Magcloud pitch handoff (layout in CREATION)

## Role

Plexon Collections expose CHECKION / METRON (and later other) capability truth. CREATION magazines and slides **bind refs**, not copy numbers into scene JSON. Magcloud remains the pitch surface after PNG publish — live bind is editor/canvas time in CREATION.

## Chart studio (Wave 1.3)

SiteChart binds a **Collection source** once at the top of Chart studio (`metron.collection.kpis`, `checkion.scan.latest.scores`, per-scan `checkion.scan.{id}.scores`, or `checkion.collection.scoreHistory`), then maps source fields onto label / value / color. Catalog lists completed scans for the **open Collection**. Per-row scalar bind is legacy.

## Operator note

CREATION Coolify needs `METRON_API_URL` + `CHECKION_API_URL` (or public URL fallbacks) plus shared `PLEXON_SERVICE_SECRET` for live catalog/resolve. Without them, CREATION serves a fixture catalog so Inspect UX still works locally.
