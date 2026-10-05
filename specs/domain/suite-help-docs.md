# Suite Docs & Help

**Status:** Accepted — 2026-10-05 (Wave 0–**5**: content, UI/API, embeds, walkthroughs + analytics, CHECKION + BRANDION tutorial→articles; subdomain optional deferred)  
**Knowledge:** `knowledge/suite-help-docs.md`  
**Content SSOT:** `content/help/`  
**Implements (Wave 1–3):** `lib/help/*` · `app/api/help/*` · `app/docs/*` · `app/help/*` · `app/help/embed` · `components/help/HelpHost.tsx` · `HelpWalkthrough` · product `PlatformHelpHost` · AppShell topbar + Settings link · Assistant corpus + Ask-from-Help · walkthrough seeds + usage analytics  
**Paths:** `lib/paths/help.ts` · `knowledge/paths.md`  
**Related:** `specs/domain/central-assistant-flyout.md` · `specs/domain/assistant-page-context.md` · Checkion `specs/domain/help-tips.md`

## Goals

1. One suite-wide **documentation** surface (`/docs` public) and **help** surface (`/help` auth + Help Hub overlay) for all capability apps.
2. Content lives **versioned in git** (Markdown + manifest) — bilingual `en`/`de`, PR-reviewed.
3. Hybrid with Platform Assistant: same corpus for tips, articles, and Assistant retrieval — **no second chat backend**.
4. No new primary NavRail item; Help is Header/`Settings`/Assistant-handoff, not a peer product.
5. Paths and bases only via constants — never hardcoded FQDNs.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Content SSOT | `content/help/` in plexon-v3 |
| Public docs | `PATH_DOCS_PUBLIC` = `/docs` (same-origin Phase 1) |
| Auth help | `PATH_HELP` = `/help` (+ article deep links) |
| Visibility | `public` \| `authenticated` \| `internal` |
| Locales | Both `en` and `de` files required per article |
| Chat help | Existing Platform Assistant (`central-assistant-flyout.md`) |
| Micro help | Tip-ID namespaces + `@msqdx/ui` `InfoTip` |
| Page context | Reuse `AssistantPageContext` for ranking |
| Product mounts | Wave 2: `HelpHost` hybrid (native Plexon / embed products) like Assistant |
| Collection Knowledge Pack | **Out of scope** — project data, not user docs |

## Information architecture

### Surfaces

| Surface | Route / mount | Auth | Role |
|---------|---------------|------|------|
| Public docs | `PATH_DOCS_PUBLIC` (+ `/docs/:id`) | none | Prospects, SEO, marketing |
| Auth help page | `PATH_HELP` (+ `/help/:id`) | session | Full browse + search in AppShell |
| Help Hub overlay | `HelpHost` (header `?`) | session | Contextual Top-3 + search |
| Micro tips | In-product `InfoTip` | session | Jargon / metrics only |
| Assistant | FAB / `/assistant` | session | Macro help; may open articles |

### Entry points

| Entry | Behavior |
|-------|----------|
| Header Help | Opens Help Hub overlay; Top-3 from page context |
| Settings „Hilfe & Docs“ | Navigates to `PATH_HELP` |
| Assistant „show article“ | Opens article in Hub or chat block |
| Empty / error recovery | Article link + optional Ask Assistant |
| Suite landing | Link to `PATH_DOCS_PUBLIC` |
| Public article CTA | Login → `pathHelpArticle(id)` |

**MUST NOT** add a second FAB competing with the Assistant. Help and Chat are two modes.

### Visibility matrix

| `visibility` | Public `/docs` | Auth `/help` + Hub | Assistant RAG |
|--------------|----------------|--------------------|---------------|
| `public` | yes | yes | yes |
| `authenticated` | **no** | yes | yes |
| `internal` | **no** | admin-only | admin-only |

Public index and public API **MUST** exclude non-`public` articles (CI leak test).

## Content contract

### Layout

```text
content/help/
  manifest.json          # machine SSOT (Wave 0)
  articles/<id>.en.md
  articles/<id>.de.md
```

### Manifest article fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable slug, lowercase dotted (`checkion.scan.wcag-quick`) |
| `visibility` | yes | `public` \| `authenticated` \| `internal` |
| `products` | yes | Non-empty list of product ids |
| `routes` | no | Pathname prefixes / capability keys for context ranking |
| `audience` | yes | `user` \| `admin` \| `operator` |
| `relatedTips` | no | Tip-ID list |
| `relatedArticles` | no | Article-ID list |
| `assistantHints` | no | Short retrieval strings (locale-agnostic or bilingual map) |
| `title` / `task` | yes | Per-locale map `{ en, de }` in manifest **or** YAML frontmatter in each MD file |

### Markdown articles

- One file per locale: `<id>.en.md` and `<id>.de.md`.
- Body is product-facing prose; no secrets, no Collection tenant data, no Coolify credentials.
- Internal links use article ids (`relatedArticles`), not hardcoded host URLs.

### Tip-ID convention

Dot namespaces, lowercase, stable — align with Checkion `help-tips.md`:

`product.area.term` — e.g. `checkion.score.accessibility`, `plexon.collection.binding`.

Tips **MAY** declare `relatedArticle` pointing at a help article id.

## Host & chrome (Wave 1+)

### HelpHost

Authenticated AppShells **MUST** mount `HelpHost` (Wave 1 Plexon; Wave 2 products):

- Header control opens/closes the Help Hub overlay.
- Overlay uses `@msqdx/ui` `Flyout` / `FloatingPanel` (or approved successor) — not a second `ChatOverlay` FAB.
- Ranking input: host pathname + capability (+ optional entity) from `AssistantPageContext` publishers.
- „Ask Assistant“ **MUST** open the existing Platform Assistant with article id + page context (no new orchestrator).

### Public `/docs` chrome

- Standalone public page family (like `/suite`): admitted by middleware public-path helpers.
- **MUST NOT** render authenticated AppShell rail.
- Locale via `HELP_LANG_QUERY` (`lang`) consistent with suite landing bilingual pattern.

### Auth `/help` chrome

- Full-width magazine page inside AppShell (Settings peer, not rail peer).

## API sketch (Wave 1)

| Method | Path constant | Notes |
|--------|---------------|-------|
| `GET` | `API_HELP_INDEX` | Query: `locale`, `product`, `visibility` (public route forces `public`) |
| `GET` | `API_HELP_ARTICLE` + `/:id` | Query: `locale`; 404 if visibility denied |
| `GET` | `API_HELP_CONTEXT` | Query: `pathname`, `capability`, `locale` → ranked Top-N |

Helpers: `apiHelpArticle(id)`, `pathDocsArticle(id)`, `pathHelpArticle(id)` in `lib/paths/help.ts`.

Build step (Wave 1): validate manifest + locale pairs → JSON index consumed by API.

## Assistant integration

1. Corpus with `visibility` allowed for the actor is available to Assistant retrieval (Wave 1 hook).
2. Assistant **MAY** emit a generative block or chip „Show article“ that opens Help Hub / deep link.
3. Assistant **MUST NOT** invent a parallel markdown store for the same how-to content.
4. Audion `/chat` persona workspace remains separate (`central-assistant-flyout.md`).

## Out of scope

- Collection Knowledge Pack facets / distillates as help articles
- Replacing `knowledge/*` operator docs
- External CMS or tour SaaS in Wave 0–2
- Full support desk / ticketing (Contact link placeholder only)
- Subdomain `docs.*` (optional Wave 3)

## Acceptance (Wave 0)

1. Domain spec + knowledge concept + paths entries exist and cross-link.
2. `content/help/manifest.json` lists seed articles; each id has `.en.md` and `.de.md`.
3. Path constants `PATH_DOCS_PUBLIC`, `PATH_HELP`, API helpers exist; public docs path is admitted by middleware helpers for `/docs` and `/docs/*`.
4. Contract tests cover: files exist, locale pairs, visibility vocabulary, no `authenticated`/`internal` ids marked public incorrectly, specs-index + paths references.
5. No UI pages required yet beyond constants/middleware readiness for Wave 1.

## Acceptance (Wave 2)

1. Each capability AppShell mounts `PlatformHelpHost` (iframe → Plexon `PATH_HELP_EMBED`).
2. Embed receives `product`, `pathname`, `capability`, optional `article`, `theme`.
3. Checkion tips MAY declare `relatedArticle` and open the product HelpHost.
4. No second FAB; Help trigger is top-end fixed chip (rail-first shells) or equivalent.
5. Contract tests cover embed path + product host files.

## Wave 3 — Walkthroughs + Analytics

**Status:** Implemented 2026-10-05 (subdomain `docs.*` remains optional/deferred).

### Walkthroughs

- Content SSOT: `content/help/walkthroughs/index.json`
- Loader: `lib/help/walkthroughs.ts`
- API: `GET API_HELP_WALKTHROUGHS` (`/api/help/walkthroughs`) — list (`product`, `pathname`, `locale`) or detail (`id`)
- UI: `HelpWalkthroughPlayer` — replayable, Esc/skip, focus restore, Tab trap, `aria-live`, `prefers-reduced-motion`
- Anchors: `[data-help-anchor='…']` (NavRail `dataHelpAnchor` → attribute); highlight skipped under reduced motion scroll smooth
- Hub lists walkthroughs for current product/path; native HelpHost lifts player above the dialog

### Analytics

- Events → `usage_events` with `tokens=0` (authenticated only; anonymous `202` no persist)
- Types: `help_open`, `help_search_zero`, `help_article_open`, `help_ask_assistant`, `help_walkthrough_*`
- Client: `lib/help/track-client.ts` → `POST API_HELP_EVENTS`
- Server: `lib/help/analytics.ts` + `app/api/help/events/route.ts`

### Paths

| Constant | Value |
|----------|-------|
| `API_HELP_EVENTS` | `/api/help/events` |
| `API_HELP_WALKTHROUGHS` | `/api/help/walkthroughs` |

### Acceptance (Wave 3)

1. Seed walkthroughs load for plexon + checkion; bilingual titles/bodies.
2. Help Hub can start a walkthrough; Esc dismisses; completion stored in `localStorage`.
3. Analytics route accepts known event types; rejects unknown.
4. Contract tests cover walkthrough loader + path constants + analytics type guard.
5. Subdomain `docs.*` is **not** required for Wave 3 done.

## Wave 4 — CHECKION tutorial corpus → Help articles

**Status:** Implemented 2026-10-05.

Port user-facing how-to from `knowledge/tutorials/checkion-*` into `content/help/` (no production IDs, no screenshot assets required).

### New / enriched articles

| id | Source |
|----|--------|
| `checkion.getting-started` | `articles/checkion-fuenf-pruefungen.md` + series overview |
| `checkion.scan.domain-deep` | `checkion-03-domain-deep-scan.md` |
| `checkion.scan.seo-crawl` | `checkion-04-seo-crawl.md` |
| `checkion.scan.wcag-quick` (enriched) | `checkion-02-wcag-single-scan.md` |
| `checkion.scan.geo-layers` (enriched) | `checkion-05-geo-model-memory.md` |

### Bridges

- Checkion tips `launch.seo`, `launch.depth.*`, `launch.geo.*` → `relatedArticle`
- Walkthrough `checkion.getting-started.path` → getting-started article
- Production storyboards remain in `knowledge/tutorials/` (paused recording program)

### Acceptance (Wave 4)

1. Manifest lists new ids with `.en.md` / `.de.md` pairs; public visibility except GEO layers stay `authenticated`.
2. Tip `relatedArticle` ids resolve against the plexon help manifest.
3. Contract tests cover new article ids + tip bridge.
4. Subdomain `docs.*` still deferred.

## Wave 5 — BRANDION tutorial corpus → Help articles

**Status:** Implemented 2026-10-05.

Port user-facing how-to from `knowledge/tutorials/brandion-*` into `content/help/` (no staging FQDNs or production guideline ids in article bodies).

### New articles

| id | Source |
|----|--------|
| `brandion.getting-started` | `brandion-first-two.md` |
| `brandion.guidelines.activate` | `brandion-02-guideline-activate.md` |
| `brandion.analysis.measured-evaluate` | `brandion-01-measured-evaluate-pdf.md` |

### Bridges

- Walkthrough `brandion.getting-started.path` → getting-started article
- Production storyboards remain in `knowledge/tutorials/`
- Audion tutorial scripts still **Planen** — deferred to a later wave

### Acceptance (Wave 5)

1. Manifest lists Brandion ids with locale pairs; all three `public`.
2. Walkthrough lists under product `brandion`.
3. Contract tests cover Brandion article ids + walkthrough.
4. Subdomain `docs.*` still deferred.
