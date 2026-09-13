# PLEXON suite landing — craft notes

**Spec:** `specs/domain/plexon-suite-landing.md`  
**Route:** `/suite` · `PATH_SUITE_LANDING`  
**Public:** yes (no AppShell chrome)

## Why this page exists

Authenticated `/` is the dashboard. `/products` is the in-app catalog. `/agency` and the HTML demos are art-direction prototypes for other brands. `/suite` is the **MSQ DX / PLEXON** introduction: Collection as the operating unit, products as a working sequence.

## SPIRION (2026-09-12)

MCP `https://spirion-api.projects-a.plygrnd.tech/mcp` · tools `spirion.captures_list` / `spirion.capture_prompt_pack` (no `platformProjectId`).

| capture_run_id | requested_url | craft taken |
|---|---|---|
| `cap_1350292d44c14ed8b7278e325030e78b` | https://jemimahbarnett.com/ | Display ~174px vs body 16px; outline CTA; type overlay; ghosted section words; invert band; tiny chrome; avoid three-up / glass / AI gradients |
| `cap_24ba63753b384682be07981b4da317eb` | https://roxane.digital/ | Conversion fold (headline + CTA) before content; outline CTA |

`spirion.compose_brief` was unavailable on this MCP build (routes to `dig_compose_brief`). Synthesis is in the spec + `lib/suite-landing.ts`.

**Not cloned:** Playfair/Montserrat pairing, #000/#dcc2b4, portraits, source copy, Roxane navy.

## Invented look

| Token | Value | Role |
|---|---|---|
| Ground | `#101210` | Cover, invert, close |
| Paper | `#EFE7D6` | Thesis, sequence, hub |
| Signal | `#D6FF3C` | Live Collection, rules, hover |
| Dust | `#9A9488` | Meta chrome |
| Display | Fraunces | Editorial mass |
| UI | Syne | Headings / nav |
| Mono | IBM Plex Mono | Folio, roles, index |

Primary CTA chrome is **outline**. Corner language is mixed: pill for enter, hairline rules for the directory.

## Paths

| Key | Value |
|---|---|
| Page | `/suite` (`PATH_SUITE_LANDING`) |
| Locale | `/suite` (DE default) · `/suite?lang=en` · query key `lang` |
| Enter | `/register` · `/login` |
| Fonts | `FONT_URL_SUITE_LANDING` in `lib/constants.ts` |
| Absolute OG base | `NEXTAUTH_URL` or `PUBLIC_APP_URL` |

## Bilingual

- Copy: `getSuiteLandingCopy('de' | 'en')` in `lib/suite-landing.ts`
- Resolution: explicit `?lang=` → else `getServerLocale()` (cookie + Accept-Language)
- Masthead toggle: DE / EN with `aria-current` on active
- Metadata: hreflang + Open Graph `locale` / `alternateLocale`

## Hero budget

≤960px: hide stave index and masthead CTA; keep conversion in hero foot + directory below the fold.
