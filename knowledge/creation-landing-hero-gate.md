# Landing hero quality gate (media required)

**Date:** 2026-09-13  
**Code:** `lib/assistant/creation-scene-quality.ts` · Creation `craft-debug.ts`  
**Playbook:** `creation_landing_v1`

## Problem

Agents shipped long text-only landings (Page 4 style: Nav + Display + body, dark fill, **no** `backgroundImage` / large SiteImage). Gate used to pass when `hasLargeDisplay` alone was true (`!display && !media`).

## Rule

Landing job fails unless craft stats show **both**:

- `hasLargeDisplay` (or `maxFontSizePx >= 48`)
- `hasHeroMedia` (large SiteImage **or** stack `backgroundImage` / `background` with `url(` / `https://`)

Creation also emits soft flag `craft-no-hero-media` when `!hasHeroMedia && nodeCount >= 8`.

## Operator

Rebuild paste: `creation-v3/knowledge/gallery-hero-slider-prompt.md` § Rebuild Page 4.
