# Suite Docs & Help — Gesamtkonzept

**Stand:** 2026-10-05 (Wave 2: product HelpHost embeds + Checkion tip→article)  
**Spec:** [`specs/domain/suite-help-docs.md`](../specs/domain/suite-help-docs.md)  
**Paths:** [`paths.md`](paths.md) · Konstanten `lib/paths/help.ts` / `lib/constants.ts`  
**Content-SSOT:** [`content/help/`](../content/help/)  
**Verwandt:** [`central-assistant-flyout.md`](central-assistant-flyout.md) · [`handover/suite-knowledge-base.md`](handover/suite-knowledge-base.md) · Checkion `help-tips.md`

## Zweck

Gemeinsamer **Dokumentationsbereich** und **Hilfsbereich** für alle Suite-Apps (Plexon, Checkion, Audion, Brandion, Creation, Metron, Videon; Companion-Kapitel Echon / Spirion / Magcloud): self-serve, kontextuell, bilingual (de/en), ohne zweiten Chat-Stack und ohne neues Primary-Rail-Produkt neben dem Platform Assistant.

## Locked decisions

| Entscheidung | Wahl |
|---|---|
| Content-SSOT | Git-versioniertes Markdown im Repo (`content/help/`) |
| Reichweite | Auth in-app **und** öffentlich (`/docs`) |
| Sprachen | `en` + `de` (Paarpflicht in CI) |
| Hilfe-Chat | Bestehender Platform Assistant — kein zweites Backend |
| Micro-Hilfe | Suite-weite Tip-IDs + `@msqdx/ui` `InfoTip` (Checkion-Muster) |
| Rail | Kein neues Primary-Rail-Item |
| DS | Nur `@msqdx/ui` (`Flyout` / `FloatingPanel`, `Accordion`, `Tabs`, `MarkdownProse`, `EmptyState`, `ChatOverlay`) |
| Paths | Nur Konstanten — nie hardcoden |

## Drei Schichten (Hybrid)

```text
Micro (InfoTip / EmptyState)
        ↓ „Mehr erfahren“
Meso  (Help Hub Overlay · /help · /docs)
        ↓ „Ask Assistant“ / „Artikel zeigen“
Macro (Platform Assistant FAB + Orchestrator)
```

1. **Micro** — Feld-/Metrik-Hilfe, Empty States, Chrome-Tips.  
2. **Meso** — durchsuchbarer Help Hub + Artikel (Overlay, Full Page, öffentliche Site).  
3. **Macro** — Platform Assistant für offene Fragen und Collection-Kontext; zitiert denselben Corpus.

**Regel:** Tip-IDs und Artikel-IDs teilen eine Taxonomie. Assistant-RAG liest denselben Corpus — kein paralleles Wissenssilo. Collection Knowledge Pack bleibt **Projektdaten**, nicht Help.

## Information Architecture

### Öffentliche Docs (`PATH_DOCS_PUBLIC` = `/docs`)

- Unauthentifiziert, bilingual `?lang=de|en`.
- Nur Artikel mit `visibility: public`.
- Keine Collection-Daten, keine Operator-Runbooks.
- Chrome: Suite-Landing-/Docs-Chrome (kein AppShell-Rail).
- Erzählung folgt der Suite-Journey (ECHON → AUDION → CHECKION → BRANDION → CREATION …), nicht konkurrierenden „App-Projekten“.
- CTA „In der Suite öffnen“ → Login → `PATH_HELP` / Artikel-Deep-Link.

### Authentifizierter Help Hub (`PATH_HELP` = `/help`)

- Full Page im AppShell (magazine, wie Settings).
- Overlay `HelpHost` (Header-`?`) in jeder App — Top-3 aus Page Context.
- Phase 1: Plexon besitzt Content-API + `/docs` + `/help`; Produkte mounten `HelpHost` (Hybrid wie Assistant-Embed).

### Einstiege (ohne zweiten FAB)

| Einstieg | Verhalten |
|---|---|
| Header Help (`?`) | Help Hub Overlay, Top-3 = page context |
| Settings „Hilfe & Docs“ | → `/help` |
| Assistant „Artikel zeigen“ | Artikel im Hub oder Chat-Block |
| Empty State / Error | Artikel-Link + optional Ask Assistant |
| Öffentliches `/docs` | CTA → Login → `/help/:id` |
| Suite Landing | Link „Dokumentation“ → `/docs` |

Assistant-FAB bleibt Chat. Help und Chat sind **zwei Modi**, nicht zwei Eck-Buttons.

## Content-Modell

### Verzeichnis

```text
content/help/
  manifest.json    # machine SSOT (Wave 0); YAML optional later
  articles/
    <id>.en.md
    <id>.de.md
  tips/            # optional Mirror / generierte Tip-Bodies
  walkthroughs/    # Wave 3
```

### Manifest-Felder (Artikel)

| Feld | Bedeutung |
|---|---|
| `id` | Stable slug (`checkion.scan.wcag-quick`) |
| `locales` | `en` \| `de` (beide Dateien Pflicht) |
| `visibility` | `public` \| `authenticated` \| `internal` |
| `products[]` | Capability / Companion ids |
| `routes[]` | Pathname-Prefixe / capability keys für Ranking |
| `audience` | `user` \| `admin` \| `operator` |
| `task` | Job-to-be-done (pro Locale im Frontmatter oder Manifest) |
| `relatedTips[]` / `relatedArticles[]` | Querverweise |
| `assistantHints` | Kurze Retrieval-Snippets |

### Sichtbarkeit

| visibility | `/docs` | `/help` | Assistant RAG |
|---|---|---|---|
| `public` | ja | ja | ja |
| `authenticated` | nein | ja | ja |
| `internal` | nein | Admin-only | Admin-only |

### Redaktion

- PR = Review = Release (wie Specs).
- Product Owner pro Capability-Kapitel; Plexon besitzt Cross-Suite-IA.
- Marketing-Korpus aus `handover/suite-knowledge-base.md` und pausierten Tutorials → Wave-0-Seeds zuerst (Plexon Collection + Checkion Scan).

## UX-Surfaces

### Help Hub Overlay

1. Kontext-Band „Zu diesem Screen“ (Top 3)  
2. Suche  
3. Browse nach Capability / Aufgabe  
4. Artikel (`MarkdownProse`)  
5. Footer: Ask Assistant · Docs öffnen · Contact-Platzhalter  

### Micro Tips

- Namespace `product.area.term` (Checkion-Konvention suite-weit).
- Tip → `relatedArticle` Deep-Link.
- Nur Jargon/Metriken — keine Button-Dekoration.

### Walkthroughs (Wave 3)

- Replayable, dismissible, a11y (`prefers-reduced-motion`, Esc, focus restore, `aria-live`).
- Trigger from Help Hub (context/product filter), not idle popups.
- Content: `content/help/walkthroughs/index.json` · loader `lib/help/walkthroughs.ts` · API `API_HELP_WALKTHROUGHS`.
- Player: `components/help/HelpWalkthrough.tsx`; anchors via `[data-help-anchor]` (NavRail `dataHelpAnchor`).
- Kein externes Tour-SaaS.

### Analytics (Wave 3)

- `POST API_HELP_EVENTS` → `usage_events` (`tokens=0`) for authenticated users.
- Client beacon: `lib/help/track-client.ts` (`help_open`, `help_search_zero`, `help_article_open`, `help_ask_assistant`, walkthrough lifecycle).
- Anonymous accepted with `persisted: false` (no userId).

## Technische Architektur

```text
content/help/*.md  →  help_build_index  →  Help Content API
                              ↓
              /docs (public)  /help + HelpHost  Assistant RAG
                              ↓
                    Product AppShells (HelpHost mount)
```

### API (Plexon, Wave 1)

| Endpoint | Rolle |
|---|---|
| `GET /api/help/index` | Index gefiltert nach locale / product / visibility |
| `GET /api/help/articles/:id` | Artikelkörper |
| `GET /api/help/context` | Ranked Top-N aus pathname + capability |

Public-Routen liefern nur `visibility=public`. Auth-Routen filtern `internal` nach Rolle.

### Hosts

- `HelpHost` analog `PlatformAssistantHost`.
- Page Context: bestehende `AssistantPageContext` wiederverwenden — kein zweites Context-Protokoll.

### Konstanten

| Constant | Wert |
|---|---|
| `PATH_DOCS_PUBLIC` | `/docs` |
| `PATH_HELP` | `/help` |
| `pathHelpArticle(id)` | `/help/:id` |
| `pathDocsArticle(id)` | `/docs/:id` |
| `API_HELP_INDEX` | `/api/help/index` |
| `API_HELP_ARTICLE` | `/api/help/articles` |
| `API_HELP_CONTEXT` | `/api/help/context` |
| `API_HELP_EVENTS` | `/api/help/events` |
| `API_HELP_WALKTHROUGHS` | `/api/help/walkthroughs` |
| `HELP_LANG_QUERY` | `lang` |

Siehe `lib/paths/help.ts` und `knowledge/paths.md`.

## Abgrenzung

| In Scope | Out of Scope |
|---|---|
| User Docs / How-to | Collection Knowledge Pack (Projektdaten) |
| Auth Help + Public Docs | Dev-/Coolify-Runbooks als Ersatz für `knowledge/*` |
| Tip-Registry + Artikel | Audion Persona `/chat` mergen |
| Assistant-Handoff | Volles Support-Desk / Ticket-System (Wave 0–2) |
| Contact-Link-Platzhalter | Externes CMS Phase 1 |

## Rollout

| Wave | Inhalt | Status |
|---|---|---|
| **0** | Spec, Knowledge, Paths, Manifest + Seed-Artikel, Contract-Tests | **done** 2026-10-05 |
| **1** | Public `/docs`, auth `/help`, HelpHost Overlay (Plexon), Content API, Assistant Corpus-Hook + Ask-from-Help | **done** 2026-10-05 |
| **2** | HelpHost in Capability-Apps (iframe `/help/embed`), Tip→Artikel Bridge (Checkion), Kontext-Ranking via product page context | **done** 2026-10-05 |
| **3** | Walkthroughs, Analytics; optionale Subdomain `docs.*` deferred | **done** 2026-10-05 (subdomain optional) |
| **4** | CHECKION Tutorial-Korpus → Help-Artikel + Tip-Bridges | **done** 2026-10-05 |
| **5** | BRANDION Tutorial-Korpus → Help-Artikel + Walkthrough | **done** 2026-10-05 |

## Erfolgskriterien

1. Jede App hat denselben Help-Einstieg (Header `?`) und öffnet kontextuelle Artikel in-product.  
2. `/docs` indexiert nur `public`; Leak-Tests in CI.  
3. Tip- und Artikel-IDs sind konsistent; Assistant referenziert denselben Artikel.  
4. Fehlendes Locale-Paar bricht CI.  
5. Kein zweiter FAB, kein MUI, keine hardcodierten URLs.

## Seed-Inventar (Wave 0 + Wave 4–5)

| id | visibility | products |
|---|---|---|
| `plexon.collections.overview` | public | plexon |
| `plexon.assistant.getting-started` | public | plexon |
| `checkion.getting-started` | public | checkion |
| `checkion.scan.wcag-quick` | public | checkion |
| `checkion.scan.domain-deep` | public | checkion |
| `checkion.scan.seo-crawl` | public | checkion |
| `checkion.scan.geo-layers` | authenticated | checkion |
| `brandion.getting-started` | public | brandion |
| `brandion.guidelines.activate` | public | brandion |
| `brandion.analysis.measured-evaluate` | public | brandion |
| `plexon.help.using-help` | public | plexon |

Wave-4-Quellen: `knowledge/tutorials/checkion-*` · Wave-5-Quellen: `knowledge/tutorials/brandion-*` (Produktionsskripte bleiben dort; Help ist der Nutzer-SSOT).

## Messgrößen (ab Wave 1/3)

- Help opens / search zero-results  
- Ask-Assistant nach Artikel  
- Artikel-Completion (Scroll / dwell proxy)  
- Ticket-Deflection-Proxy (wenn Contact-Route existiert)
