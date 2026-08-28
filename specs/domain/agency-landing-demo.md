# Agency landing demo

**Status:** Accepted — 2026-08-24  
**Route:** `/agency`  
**Purpose:** Standalone visual prototype informed by SPIRION design intelligence.

## Goal

Create a public, self-contained design-agency landing page that demonstrates an
editorial, typography-led art direction without changing or reskinning the
authenticated PLEXON product surfaces.

## Keep / reshape / drop

| Decision | Treatment |
|---|---|
| Keep | Next.js app, centralized path constants, root providers, accessible HTML semantics, build/test pipeline |
| Reshape | Shell handling: the demo route renders without authenticated PLEXON chrome; public-route handling admits only this canonical route |
| Drop | Dashboard chrome, product navigation, card-kit layout, gradients, glass panels, decorative stock imagery |

## SPIRION synthesis

- Use extreme display/body scale contrast and a high-contrast ink/paper palette.
- Compose with full-width typographic bands, asymmetric negative space, and
  small functional navigation.
- Open with a conversion-focused headline, move into selected work, then
  capabilities and a final contact statement.
- Do not copy source branding, marketing copy, imagery, or exact compositions.

## Reuse map

| Need | Source |
|---|---|
| Route and public-path contract | `lib/constants.ts`, `middleware.ts` |
| Application providers | Existing root layout |
| Page composition | Route-local semantic React markup and CSS Module |
| UI primitives | Native semantic elements; no app-local design-system primitive is introduced |

## Motion contract

- Hero typography arrives as overlapping vertical reveals; supporting chrome
  follows at lower emphasis.
- Continuous movement is limited to a single service ticker.
- Hover movement uses transform/opacity only and stays subordinate to the copy.
- `prefers-reduced-motion: reduce` disables reveals and continuous movement.

## Acceptance

1. `/agency` is public and does not render the PLEXON shell.
2. The first viewport communicates agency positioning, work focus, and a clear CTA.
3. The page contains selected work, services, proof, and contact sections.
4. Keyboard focus is visible, layout is responsive, and reduced-motion is honored.
5. UI smoke, route contract, test suite, and production build pass.
