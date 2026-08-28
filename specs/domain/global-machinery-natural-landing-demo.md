# Global machinery natural landing demo

**Status:** Accepted — 2026-08-24  
**Route:** `/kernwerk-natural.html`  
**Purpose:** Standalone warm, tactile corporate concept for a global machinery company.

## Goal

Create a public, self-contained KERNWERK variant that feels natural and human
without presenting the business as a lifestyle or eco brand. The page should
remain credible for industrial buyers while using rounded geometry, layered
elevation, warm colour and tactile image placeholders.

## Keep / reshape / drop

| Decision | Treatment |
|---|---|
| Keep | Canonical public route, semantic HTML, compact corporate information hierarchy, build/test pipeline |
| Reshape | Industrial visual language through warm sand, forest, sage and clay; imagery uses soft masks and layered depth |
| Drop | Cold technical blue, sharp dashboard panels, glassmorphism, generic sustainability symbolism, oversized type spectacle |

## SPIRION synthesis

- Lead with a broad media-led hero, calm headline and subordinate navigation.
- Use warm dark ink with cream surfaces, outlined primary chrome and deliberately
  varied rounded shapes rather than one repeated card template.
- Create depth with three restrained shadow levels and overlapping media/caption
  elements; preserve generous breathing room around major story beats.
- Mix natural-light industrial image placeholders with material-detail crops.
- Do not copy source branding, marketing copy, imagery or exact compositions.

## Reuse map

| Need | Source |
|---|---|
| Route and public-path contract | `lib/constants.ts`, `middleware.ts` |
| Page composition | One semantic, self-contained HTML document in `public/` |
| UI primitives | Native HTML elements; no app-local design-system primitive is introduced |

## Motion contract

- Initial content settles with a short opacity/translate reveal.
- Hover depth is limited to transform and shadow changes on actionable cards.
- `prefers-reduced-motion: reduce` disables reveal and smooth scrolling.

## Acceptance

1. `/kernwerk-natural.html` is public and leaves both earlier KERNWERK concepts unchanged.
2. The first viewport communicates global machinery, lifecycle partnership and a clear CTA.
3. The page contains solutions, approach, lifecycle support, global presence and contact.
4. All image placeholders are labelled and the page has visible keyboard focus, responsive layout and reduced-motion support.
5. The focused UI contract test and production build pass.
