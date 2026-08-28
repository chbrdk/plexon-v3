# LOUDER social brand landing demo

**Status:** Accepted — 2026-08-25  
**Route:** `/louder.html`  
**Purpose:** Standalone expressive website concept for a fictional social-first creative brand.

## Goal

Create a public, self-contained brand site that feels native to social culture:
fast, colorful, surprising and highly visual. The result should resemble an
animated poster wall rather than a conventional agency template, while keeping
the core story and calls to action readable.

## Keep / reshape / drop

| Decision | Treatment |
|---|---|
| Keep | Canonical public route, semantic HTML, accessible navigation, build/test pipeline |
| Reshape | Brand storytelling as layered posters, cut-out media, stickers, tickers and hard physical shadows |
| Drop | Corporate minimalism, glassmorphism, SaaS dashboards, muted gradients, equal card-kit layouts |

## SPIRION synthesis

- Use an image-led, cinematic opening anchored by extreme condensed typography.
- Treat media as physical cards: slightly rotated, saturated, shadowed and
  clustered against generous negative space.
- Keep navigation minimal and let campaign work dominate the visual hierarchy.
- Alternate dense color narrative bands with clean editorial breathing room.
- Use the measured high-energy red/black/white rhythm as a structural cue, then
  extend it with a controlled acid palette for the fictional brand.
- Do not copy reference names, copy, imagery or exact compositions.

## Reuse map

| Need | Source |
|---|---|
| Route and public-path contract | `lib/constants.ts`, `middleware.ts` |
| Page composition | One semantic, self-contained HTML document in `public/` |
| UI primitives | Native HTML elements and CSS shapes; no app-local design-system primitive |

## Motion contract

- Two marquees move continuously at low priority.
- Hero cards settle with staggered rotation and translation.
- Hover interactions use transform, color and hard-shadow offsets.
- `prefers-reduced-motion: reduce` disables continuous and entrance motion.

## Acceptance

1. `/louder.html` is public and existing prototype pages remain unchanged.
2. The first viewport establishes LOUDER, its positioning and one direct CTA.
3. The page contains selected social work, capabilities, creator network and contact.
4. Visual hierarchy remains readable on mobile, focus is visible and reduced motion is honored.
5. The focused route contract test and production build pass.
