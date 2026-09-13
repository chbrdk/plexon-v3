# PLEXON suite landing

**Status:** Accepted — 2026-09-12  
**Route:** `/suite` (`PATH_SUITE_LANDING`)  
**Purpose:** Public marketing landing for the MSQ DX suite. Explains PLEXON as the Collection hub and walks the individual products as one working sequence — not a generic SaaS feature kit.

## Goal

Give an unauthenticated visitor a distinctive, typography-led introduction to:

1. **PLEXON hub functions** — Collection, Assistant, Flows, Knowledge.
2. **The product sequence** — how specialties actually work together.
3. **Each product’s role** — capability, companion, hub, or roadmap.

The page must not reskin authenticated PLEXON chrome and must not collapse into a hero + three-up card grid.

## Keep / reshape / drop

| Decision | Treatment |
|---|---|
| Keep | Next.js app, centralized path constants, public-route contract, accessible HTML, build/test pipeline |
| Reshape | Shell handling: this route renders without authenticated PLEXON chrome; public-path helper admits the canonical route with the other standalone demos |
| Drop | Dashboard chrome, product-catalog cards, glass panels, AI gradients, neon orbs, Inter-16px-radius kits, filled neon CTAs, equal three-up as the page |

## SPIRION synthesis

Live library path (2026-09-12), **structure and craft only** — do not clone source brands, copy, imagery, or measured palettes.

| Capture | Site | Use |
|---|---|---|
| `cap_1350292d44c14ed8b7278e325030e78b` | jemimahbarnett.com | Extreme display/body contrast, type-as-image, tiny chrome vs massive editorial type, ghosted section words, invert band, outline CTA, pill-scale chrome |
| `cap_24ba63753b384682be07981b4da317eb` | roxane.digital | Conversion-first fold (headline + CTA), then content; outline CTA |

**Obey avoid[]:** glassmorphism, purple-to-blue AI gradients, equal three-up as the whole page, abstract blobs/orbs, Inter-only 16px card kit, card grid in the hero, filled neon gradient CTAs.

**Invented look (not a foreign-brand clone):** newsprint paper + carbon ink + acid signal lime. Display serif (Fraunces) × geometric sans (Syne). Varied band heights. Primary CTA is outline.

**Page arc:** masthead/hero conversion → thesis → sequence (the suite chain) → product directory → hub functions → close CTA.

## Product truth

Do not invent a second project model. Copy must match suite positioning:

- **Collection** is the only user-facing project.
- CHECKION, AUDION, BRANDION, CREATION, SPIRION are Collection **capabilities**.
- ECHON is a **research companion**.
- VIDEON is **roadmap** until suite-integrated.
- Sequence for stakeholders: ECHON → AUDION → CHECKION → BRANDION → SPIRION → CREATION, held in PLEXON.

Source: `knowledge/handover/confluence-ai-product-pages.md`.

## Reuse map

| Need | Source |
|---|---|
| Route and public-path contract | `lib/constants.ts` (`PATH_SUITE_LANDING`, `isPublicStandalonePath`), `middleware.ts` |
| Enter CTAs | `PATH_LOGIN`, `PATH_REGISTER` |
| Fonts | `FONT_URL_SUITE_LANDING` |
| Application providers | Existing root layout |
| Page composition | Route-local semantic React + CSS Module; bilingual copy/data in `lib/suite-landing.ts` (`getSuiteLandingCopy`) |
| Locale | Query `lang` (`SUITE_LANDING_LANG_QUERY`) · fallback `getServerLocale` · helpers `pathSuiteLanding` / `resolveSuiteLandingLang` |
| Share meta | Page `generateMetadata` (OG + hreflang). Absolute URLs via `NEXTAUTH_URL` / `PUBLIC_APP_URL` |
| UI primitives | Native semantic elements — no app-local design-system primitive, no `@msqdx/ui` chrome on this public page |

## Motion contract

- Hero type arrives as staggered vertical reveals; masthead follows at lower emphasis.
- Continuous movement is limited to one capability ticker and a slow signal pulse.
- Hover uses transform/opacity only.
- `prefers-reduced-motion: reduce` disables reveals, ticker, and pulse.

## Acceptance

1. `/suite` is public and does not render the PLEXON shell.
2. The first viewport states Collection positioning and offers a clear enter CTA.
3. The page contains the working sequence, every suite product with its role, and hub functions (Collection, Assistant, Flows, Knowledge).
4. Keyboard focus is visible, layout is responsive, reduced-motion is honored.
5. UI smoke, route contract, test suite, and production build pass.
6. **Bilingual DE/EN:** `?lang=de|en` (default DE, else cookie/`Accept-Language` via `getServerLocale`). Toggle in masthead. Copy lives in `lib/suite-landing.ts` (`getSuiteLandingCopy`).
7. **Share meta:** `generateMetadata` emits title/description, `alternates.languages`, Open Graph locale + Twitter summary.
8. **Hero budget (≤960px):** product stave hidden; masthead CTA deferred to hero foot — directory remains the product index.
