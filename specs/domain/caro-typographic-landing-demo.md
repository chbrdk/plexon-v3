# CARO typographic landing demo

**Status:** Accepted — 2026-08-25  
**Route:** `/caro.html`  
**Purpose:** Standalone monochrome typographic tribute to CARO.

## Goal

Create a bold, affectionate landing page for “CARO — the best person on the
planet.” Typography is the primary visual material. The composition should feel
cinematic and confident while curved transitions, kinetic lines and generous
negative space keep it fluid rather than harsh.

## Keep / reshape / drop

| Decision | Treatment |
|---|---|
| Keep | Canonical public route, semantic HTML, accessible navigation, build/test pipeline |
| Reshape | Tribute copy as oversized editorial type, moving ribbons, circular type motifs and alternating dark/light bands |
| Drop | Photography, color accents, generic agency cards, glassmorphism, gradients and rigid dashboard grids |

## SPIRION synthesis

- Contrast tiny peripheral chrome with a cinematic full-viewport display word.
- Treat type as imagery through cropping, outlines, overlap and diagonal motion.
- Alternate dense black bands with airy warm-white fields.
- Use curved section boundaries and pill/circle geometry to soften the heavy type.
- Finish with a wide underlined statement and directional CTA.
- Do not copy reference names, copy, imagery or exact compositions.

## Reuse map

| Need | Source |
|---|---|
| Route and public-path contract | `lib/constants.ts`, `middleware.ts` |
| Page composition | One semantic, self-contained HTML document in `public/` |
| UI primitives | Native HTML elements and CSS typography; no app-local design-system primitive |

## Motion contract

- Hero letters settle into place with staggered vertical movement.
- Two typographic ribbons move continuously at low priority.
- Hover states use underline and horizontal translation only.
- `prefers-reduced-motion: reduce` disables continuous and entrance motion.

## Acceptance

1. `/caro.html` is public and all existing prototype pages remain unchanged.
2. The first viewport communicates CARO and the “best person on the planet” premise.
3. The page contains a character statement, three affectionate reasons and a final dedication.
4. The layout remains readable on mobile, focus is visible and reduced motion is honored.
5. The focused route contract test and production build pass.
