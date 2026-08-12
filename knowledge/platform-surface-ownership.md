# PLEXON Surface Ownership and Product Onboarding

Stand: Mai 2026

## Was gehoert in PLEXON

`PLEXON` besitzt nur die produktuebergreifenden Surfaces:

- zentrale Nutzer und Rollen
- Profil und Sprache
- Usage/Billing
- Produkt-Registry
- Produktstatus und Health
- Einstiegspunkte / Deep Links
- **Collection Knowledge Pack** (facetierte Shared Briefs: Profile, Competitive, Research-Distillate, GEO-Kontext, reservierte Brandion-Facet) — SoT unter der Collection; siehe `specs/domain/collection-knowledge-pack.md`
- **Central Assistant Flyout** (plattformweiter Orchestrator-Chat als Dock-End-Overlay in allen v3-Apps; Embed `/assistant/embed`; Expand `/assistant`) — siehe `specs/domain/central-assistant-flyout.md` · `knowledge/central-assistant-flyout.md`
- spaeter: globale Suche, zentrale Boards, letzte Aktivitaeten, Read-only-Summaries

## Was bleibt produktlokal

### CHECKION

- Scan-Launcher
- Deep-Scan-Ergebnisse
- Projekt-Workspaces
- GEO / E-E-A-T (Jobs, `queryRuns`, Presence) — Distillate optional in Pack-Facet `geo_context` / `competitive` (`checkion-v3/specs/domain/geo-knowledge-consume.md`)
- Rank Tracking
- MCP Server und produktlokale Tool-APIs

### AUDION

- Persona-Admin
- Projekte, Target Groups, Journeys
- Reiches Knowledge-Dossier / Research (TipTap) — Distillate → Pack-Facet `research_brief` (`audion-v3/specs/domain/knowledge-pack-publish.md`)
- BFF-/Proxy-Schicht im Next-Web
- **Persona-/TG-Chat und Voice-Flows** (produktlokal — nicht der Plexon Central Assistant)
- Multi-Service-Runtimes (`api`, `chat-api`, `indexing-api`, Worker)

### BRANDION (v3 Shell → Domain)

- **v3 Shell** (`chbrdk/brandion-v3`): AppShell, Plexon Auth, API-Tokens, Stub-Hubs Analysis/Guidelines — Registry via `NEXT_PUBLIC_BRANDION_URL`
- Guidelines, Tokens, Voice, Asset-Checks — Domain nach Keep/Drop; Pack-Facet `brand` bleibt **reserviert** bis Publish-API (nur Refs/Distillate, kein Voll-Dump)
- Attach: `brandion-v3/knowledge/staging-coolify.md`

### CREATION (v3 Shell → Zaoly runtime)

- **v3 Shell** (`creation-v3`): AppShell, Plexon Auth, domain hubs (projects / compositions magazine / library fixture) — Registry via `NEXT_PUBLIC_CREATION_URL`
- Product id: `creation` (Display **CREATION**)
- **Zaoly** (Vite editor + WC library) remains the design runtime — deep-link/embed in later waves; do not invent a second project model
- Attach: `knowledge/creation-v3-onboarding.md` · `creation-v3/knowledge/staging-coolify.md`

## Selektive Surface-Konsolidierung

Folgende Surfaces sind gute Kandidaten fuer spaetere PLEXON-Integration:

- letzter Produktzugriff pro Nutzer
- produktuebergreifende Aktivitaetsuebersicht
- zentrale Usage-Ansicht
- Registry-basierte Produktkacheln
- Read-only-Status und Summary-Surfaces

Folgende Surfaces sind **keine** guten fruehen Kandidaten:

- komplette Produktnavigation von `CHECKION`
- komplette `AUDION`-Admin-Oberflaeche
- komplexe Workflows mit produktlokalem Session- und Projektkontext

## Onboarding-Regeln fuer neue Produkte

Jedes neue Produkt, z. B. `VIDEON`, `BRANDION` oder `CREATION`, braucht vor Aufnahme in die Registry:

1. Produkt-ID
2. oeffentliche oder interne Produkt-URL
3. Login-URL
4. Health-URL
5. definierte Vertragsversion
6. definierte Plattform-Faehigkeiten
7. dokumentierte Deep-Link-Einstiege
8. Knowledge-Dokument mit Betriebsannahmen und Env-Variablen

## Minimales Onboarding-Template

- Registry-Eintrag in `PLEXON/lib/platform-products.ts`
- Knowledge-Dokument in `PLEXON/knowledge/`
- Produktseitige Vertragskonstanten
- Smoke-Test fuer Einstieg, Login und Health

## Governance

- Keine Sonderfaelle pro Produkt ohne Registry-Erweiterung
- Keine hardcodierten Produkt-Links in Komponenten
- Keine neuen plattformweiten Surfaces ohne Ownership-Entscheidung: `PLEXON` oder Produkt
