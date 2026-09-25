# Suite-Funktionsstand

**Stand:** 2026-09-25  
**Zweck:** zentraler Ist-Stand aller Nutzerfunktionen der PLEXON-Suite. Ausgangspunkt für Agentur-Aufgaben: [`suite-agentur-use-cases.md`](suite-agentur-use-cases.md).  
**Methode:** Screening der Domain-Specs, Routen und Capability-Kataloge in den Produkt-Repos. Kein Staging-Klickdurchlauf. Env, API-Keys und Federation-Modus können eine **Live**-Funktion in einer konkreten Umgebung auf Fixture oder aus schalten.

## Legende

| Markierung | Bedeutung |
|---|---|
| **Live** | Oberfläche und Handler sind da und im Produktalltag nutzbar. Keys oder `DATABASE_URL` können nötig sein. |
| **Teilweise** | Kern ist da; Tiefe, UI oder Runtime-Flag fehlt. |
| **Spec** | Spezifiziert, ohne passende Nutzerfläche. |

## Produktmodell

Für Nutzer:innen gibt es ein Projekt: die **Collection** (`platform_projects`). CHECKION, AUDION, BRANDION, CREATION, SPIRION und METRON sind Capabilities darin, keine zweiten Projektarten. VIDEON ist ein Collection-gebundener Medien-Workspace; der alte Name „Project“ heißt dort **Cut**. ECHON ist ein Research-Companion mit optionaler Collection-Bindung, kein Mirror beim Anlegen.

Registry (`lib/platform-products.ts`): `plexon`, `checkion`, `audion`, `echon`, `videon`, `brandion`, `creation`, `spirion`, `metron`. Sichtbarkeit von VIDEON, BRANDION, CREATION, SPIRION und METRON hängt am Entitlement.

Gemeinsamer Wissensstand: Collection **Knowledge Pack**. Facetten im Code: `profile`, `competitive`, `research_brief`, `geo_context`, `market_intelligence`, `media_insights`, `brand`, `sources`.

| Facette | Typische Quelle |
|---|---|
| `research_brief` | AUDION (Dossier-Destillat) |
| `geo_context`, `competitive` | CHECKION |
| `brand` | BRANDION (Referenzen, kein PDF-Dump) |
| `media_insights` | VIDEON |
| `market_intelligence` | ECHON |
| `profile`, `sources` | Collection-Pflege / Produkt-Publish |

## Landkarte

| App | Rolle | Reife der Kernarbeit |
|---|---|---|
| **PLEXON** | Collection, Wissen, Assistant, Flows, Identität | Live |
| **CHECKION** | WCAG, Domain/SEO-Crawl, GEO | Live |
| **AUDION** | Personas, Zielgruppen, Journeys, Chat, UX-Studies | Live |
| **BRANDION** | Guidelines, Tokens, Compliance, Markenmessung | Live |
| **VIDEON** | Medien, Analyse, Cuts, Export, KI-Schnitt | Live |
| **CREATION** | Seiten, Compositions, Site Kit, Kundenfreigabe | Live (macOS teilweise) |
| **METRON** | Daten, KPIs, Dashboards, Konnektoren | Live |
| **ECHON** | Signale, Waves, Foresight, Research | Live (Mac-lokal) |
| **SPIRION** | Design-Referenzen für Entwurf und Assistant | Live als MCP; eigene App nicht in diesem Screen |

---

## PLEXON

Kontrollfläche der Suite: eine Collection pro Mandat, Produkt-Launch, gemeinsames Wissen, orchestrierte Jobs, Identität und Freigaben. Die Facharbeit bleibt in den Apps.

| Fläche | Was Nutzer:innen tun | Status |
|---|---|---|
| `/projects` | Collection anlegen, listen, archivieren, wiederherstellen | Live |
| Collection-Home | Überblick, Knowledge Pack, Capability-Zusammenfassungen, Deep-Links, Client-Page-Shares | Live; Magazine-Panes für CREATION, SPIRION, VIDEON, ECHON fehlen |
| Knowledge Pack | Facetten lesen und pflegen (`profile`, `competitive`, `research_brief`, `geo_context`, `sources`); Produkte publizieren Destillate | Live |
| `/products` | Produktkacheln, Health, Launch (entitlement-gesteuert) | Live |
| Assistant (Flyout, `/assistant`, Embed) | Chat im Collection-Kontext, Verlauf, Bilder und Dokumente, Spezialisten, generative UI, Report (PDF/PPTX) | Live |
| Collection Flows `/projects/…/flows` | Graph aus Vorlagen oder Palette, Lauf, Inspektion | Live |
| Event Quick Check `/event-quick-check` | URL prüfen, GEO-Fragen, Magazin-Report, öffentlicher Share, PDF/PPTX | Live |
| Dashboard `/` | Collection-Einblicke, Produkt-Teaser, Usage | Live |
| Settings | Profil, Sprache, Theme, Passwort, API-Tokens | Live |
| Admin | Firmen, Mitglieder, Nutzer, Produkt-Entitlements, Client-Share-Policy | Live |
| Einladungen | API plus Annahme `/invite/[token]` | Teilweise (kein Mitglieder-Panel auf der Collection-Home) |
| Öffentliche Shares | Quick-Check, Assistant-Report, METRON-Dashboard | Live |
| `/board` | Älteres Prompt-Board, nicht der Collection Flow | Teilweise, Admin |
| Capability Catalog | Dieselben Job-Verträge für Assistant und Flow | Code live; Runtime-Flag `CAPABILITY_CATALOG_RUNTIME` im Code standardmäßig aus, Staging oft an |

**Flow-Familien, die Nutzer:innen setzen können:** Journey (AUDION), Quality (CHECKION: Scan, Domain, GEO), Event Quick Check, Brand (Guideline + Messung), Media (VIDEON: Analyse, Cut, Export).

**Assistant-Spezialisten:** Metron, Checkion Scan/SEO-GEO/Journey, Creation Szene/Design, Videon Media, Brandion, Echon Markt/Audience, Audion Persona/UX-Journey/Knowledge/Journey/Chat/Dokumente, Spirion Research.

**PLEXON besitzt nicht:** Scan-Dossiers, Persona-Chat, Guideline-Studio, Editor-Canvas, KPI-Engine, Schnitt, Signal-Store.

Quellen: `specs/domain/collection-projects.md`, `collection-knowledge-pack.md`, `collection-test-flow.md`, `central-assistant-flyout.md`, `capability-catalog.md`, `knowledge/platform-surface-ownership.md`.

---

## CHECKION

Messung von Qualität und Auffindbarkeit einer Website und ihrer Sichtbarkeit in KI-Antworten. Rail: Home, Scan, Projects, Settings. Ergebnis-Magazine hängen an Läufen, nicht an der Rail.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Home | Single-, Deep- und GEO-Starts, letzte Läufe, Projekte | Live |
| WCAG Quick (Single) | Eine URL prüfen; Overview, Issues (Screenshot + Marker), Detail | Live (DB oder `CHECKION_LIVE_SCANS`) |
| WCAG Deep | Mehrere Seiten, systemische Muster, Pause/Fortsetzen/Abbrechen | Live |
| SEO-Crawl | Domain-Crawl zu Titeln, Meta, Überschriften, Abdeckung | Live als Domain-Kapitel, kein eigener SEO-only-Pipeline |
| GEO Model memory (`recall`) | Ungestützte Modellkenntnis zur Marke | Live |
| GEO Live search | Gestützte Suche / Grounding, getrennt von Model memory auswerten | Live |
| GEO-Auswertung | Cited share, Share of voice, Antwort-Insights, Queries, CSV, Verlauf, Umbenennen | Live |
| EEAT-Anhang | On-Page-EEAT optional zum GEO-Job | Teilweise |
| Knowledge Pack | Zieht `research_brief`; publiziert `geo_context` und `competitive` | Live bei Federation `live`, sonst Fixture |
| Share | Öffentliche Read-only-Übersicht für Single und Domain | Live |
| MCP | Projekte, Scans, Domain, GEO, Share, `fetch_page` | Live (eigener Dienst) |
| Journey-UI, Reports-Magazin | Platzhalter | Spec |
| AUDION-Übergabe | Deep-Link füllt nur WCAG Quick | Live |

Scoring-Arten: Accessibility, SEO, Best Practices, Performance, UX, Eco, Generative.

Quellen: `checkion-v3/specs/domain/scan-modes.md`, `scan-result-workspace.md`, `geo-measurement-layers.md`, `geo-competitive-presence.md`, `mcp-server.md`.

---

## AUDION

Verstehen, für wen gearbeitet wird und was diese Menschen auf einer Fläche erleben. Rail: Chat, Home, Projects, Personas, Target groups, Journeys, Studies, Settings.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Projekte | Collection-Spiegel, Dossier (TipTap), Team, Archiv, KI: Zielgruppen, Personas, Research, Journey, Knowledge-Pack-Publish | Live |
| Personas | Profil, Ziele, Kanäle, Moodboard, Chat, Anreicherung, Avatar | Live |
| Zielgruppen | Segment, Personas verknüpfen und erzeugen, alle fragen | Live |
| Journeys | Phasen, Momente, Validate (automatisch, Chat oder beides) mit Reibung und Zitaten | Live |
| Persona-Chat | Stream, Zielgruppe oder Projekt (bis 10, ohne Verlauf), Bilder, Dokumente, RAG aus Projektwissen | Live |
| Video-Call | Tavus und Beyond Presence, wenn Keys und Persona-IDs gesetzt sind | Live |
| Sprache im Chat | — | Teilweise (Stub) |
| UX Studies | Studie → Wave → Agent-Lauf → Evaluate → Compare → Report (Soft-Q, Hypothesen) | Live; Agent braucht `UX_JOURNEY_AGENT_URL`, sonst Fixture |
| UX-Test-Flows | Knotengraph, Live-Gates, Board | Live |
| Knowledge Pack | Destillat nach `research_brief` | Live bei Collection-Bindung |
| CHECKION aus einem Study-Schritt | Deep-Link auf Single-Scan | Teilweise |
| Queue | Job-Dashboard aus Fixtures, nicht in der Rail | Teilweise |

Personas, Journeys und Chat-Transkripte bleiben in AUDION. In den Pack geht das Destillat.

Quellen: `audion-v3/specs/domain/persona-workspace.md`, `journey-workspace.md`, `chat-workspace.md`, `ux-study-workspace.md`, `ux-test-flow-model.md`, `knowledge-pack-publish.md`.

---

## BRANDION

Source of Truth für Corporate Design einer Collection: Tokens, Regeln, gemessene Prüfung. Rail: Home, Projects, Analysis, Guidelines, Settings. CREATION bindet nur Pfade, keinen eigenen Token-Store.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Guidelines | Anlegen, importieren, suchen, eine Guideline pro Collection aktivieren | Live |
| Token Studio | Farbe, Typo, Space, Radius, Border, Size, Layout, Shadow, Opacity, Logo, Motion, Content; Kanäle digital und print | Live |
| Compliance | Regeln mit Schwere und Toleranz, Trockenlauf gegen Tokens | Live |
| Analysis | PDF, Bild oder URL messen (pdf, image, css, computed, dtcg, html, office) | Live |
| Findings | Fail-Katalog nach Linse, Expected/Actual, Dokument-Inspektor | Live |
| Active Pack | CREATION und Maschinen holen `GET /api/guidelines/active-pack` | Live (API) |
| MCP | Guidelines, Tokens, Regeln, Evaluate, Läufe | Live |
| Knowledge Pack | Facette `brand` als Referenz | Live (weich) |
| Detection Lab | Produktfläche eingezogen, Redirect auf Analysis | Spec / verworfen |
| Beliebige Kanalprofile, Chromium-Crawl, PDF-Vision als Produkt | — | Spec |

VIDEON ruft dieselbe Messung für Szenen-Frames auf und erfindet kein Bestehen.

Quellen: `brandion-v3/specs/domain/guidelines-hub.md`, `design-tokens.md`, `compliance-rules.md`, `analysis-hub.md`, `findings-workspace.md`, `creation-token-export.md`, `mcp-server.md`.

---

## VIDEON

Collection-gebundene Mediathek: hochladen, analysieren, in natürlicher Sprache suchen, schneiden, exportieren. Topbar: Chat, Übersicht, Projekte, Mediathek, Analysen.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Upload | Multipart in die Collection; Auto-Analyse ohne Demucs | Live |
| Analyse | Vision, Transkript, Stems (Demucs), Aggregat; Marken-Check separat | Live |
| Szenen-Suche `/chat` | Treffer mit Timing, Sprung in den Clip | Live |
| Mediathek und Analysen | Filtern, öffnen | Live |
| Media-Editor | Wiedergabe, Szenen, Transkript, Reframe, KI-Edit, Stems | Live |
| Reframe | Ableitungen (Robust-CPU), Download | Live |
| Generative Edit / Create | Entwurf, Freigabe, Übernahme; OpenRouter Video | Live |
| Cuts | Liste und Schnitt: Bin, Monitor, V1, V2, VO, Snap, Ripple und weitere Edit-Gesten, Export MP4 und Premiere XML | Live |
| Knowledge Pack | `media_insights` nach erfolgreicher Analyse | Live (Backend, kein eigener Hub) |
| MCP und Assistant | Suche, Analyse, Cut, Export, Reframe, Generate, Brand-Check | Live |
| Adobe UXP | Library-Panel, Szenen in Premiere | Live als Zusatz, nicht die Web-App |
| Flow-Knoten für Reframe und Generate | — | Spec (bewusst ohne Hit-Card) |

Quellen: `videon-v3/specs/domain/videon-ui-surfaces.md`, `analysis-capabilities.md`, `media-reframe.md`, `media-generative-edit.md`, `cut-timeline-edit-ux.md`, `mcp-server.md`, `plexon-v3/specs/domain/videon-integration.md`.

---

## CREATION

Gestalten in der Collection: Szenen, Site Kit, Markenpfade, Kundenansicht. Routen: Home, Projects, Compositions, Library, Kit, Editor, Settings, Client-Share.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Compositions | Szenen anlegen und im Editor öffnen | Live |
| Library | Patterns der Collection und globale Site-Kit-Atome | Live |
| Kit Playground `/kit` | TSX ausprobieren | Live |
| Editor | Canvas, Ebenen, Seiten, Masters, Token Studio, Inspect, HUD, Chart Studio | Live |
| Brand-Tokens | Pfade aus dem aktiven Brandion-Pack; Blätter dürfen per BFF zurückgeschrieben werden | Live |
| HTML-Import | Landing-HTML in eine Seite, danach feinjustieren | Live |
| Code-Export | React, Tailwind, SwiftUI; Linter | Live (Web); macOS nachgezogen |
| Kommentare | Pins, Antworten, Auflösen | Live |
| Client Page Share | Ansicht für Externe, Passwort, TTL, Gäste kommentieren | Live |
| MCP / Agent | Szene lesen, Ops anwenden, HTML importieren | Live |
| Storyblok | Pack erzeugen und pushen, Preview | Teilweise (PoC, kein Rücksync) |
| Magazine-Templates | Veröffentlichte Szenen für u. a. Quick-Check-PDF | Teilweise (API, wenig Hub-UI) |
| macOS-App | Dieselben Hubs nativ | Teilweise (Parity-Welle) |
| VIDEON-Stills | Standbilder in die Asset-Bibliothek | Live (frühe Welle) |

CREATION wertet keine KPIs aus. Dashboards gehören zu METRON. Diagramme im Editor sind gestaltete Site-Kit-Charts.

Quellen: `creation-v3/specs/domain/editor-workspace.md`, `compositions-hub.md`, `site-kit.md`, `brand-token-consume.md`, `client-page-share.md`, `html-scene-import.md`, `code-export-handoff.md`, `mcp-server.md`, `macos-editor-app.md`.

---

## METRON

Zahlen einer Collection: Quellen, server-seitig bewertete KPIs mit Herkunft, eingeschränkte Dashboards. Rail-Hubs: Projects, Datasets, KPIs, Dashboards, Sources.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Datasets | Excel/CSV importieren, Spalten benennen und typisieren | Live |
| KPIs | Aggregat und Ratio, serverseitig auswerten, Herkunft sehen | Live |
| Firmen-Bibliothek | KPI-Vorlagen an eine Collection binden | Live |
| Dashboards | Aus KPIs oder Vorlagen bauen, ansehen, Filter, teilen | Live |
| Builder | Palette, Raster, schwebendes Inspect | Live |
| Share | Öffentliche Ansicht ohne Collection-Mitgliedschaft | Live |
| Suite-Konnektoren | CHECKION-, AUDION- und Pack-Destillate als Datasets | Live |
| Starter-Packs | Site Health (CHECKION), Journey (AUDION), GA4 Traffic — nur auf Apply | Live |
| Externe Quellen | GA4, Google Sheets, HubSpot | Live |
| MCP | Listen, Auswerten, Anlegen (mit Bestätigung), Sync | Live |
| Home | Sprungbrett, keine eigene Analyse | Teilweise |
| Zeitraumvergleiche MoM/YoY als volle UI | — | Spec |

Keine freie BI-Fläche und keine Formel-Wahrheit im Browser.

Quellen: `metron-v3/specs/domain/product-overview.md`, `kpi-engine.md`, `dashboard-builder.md`, `data-ingest.md`, `suite-connectors.md`, `external-connectors.md`, `dashboard-share-links.md`, `mcp-server.md`.

---

## ECHON

Marktbewegung: Presse und RSS werden zu Signalen, Signale zu Waves, daraus Foresight, Szenarien, Briefings und Chat. Produktlinie ist v3, Mac-lokal. Kein allgemeiner Newsreader.

| Funktion | Was Nutzer:innen tun | Status |
|---|---|---|
| Signale | Liste, Detail, ähnliche Nachbarn, Volltext | Live |
| Waves | Cluster, Streuung, Detect, Mitglieder | Live |
| Foresight | Steigende Tags, Wave-Momentum, Watchlist, regionaler Filter | Live |
| Szenarien | Branchenfragen, Verlauf, Sprung in Briefing oder Chat | Live |
| Research | Szenarien und Signale durchsuchen | Live |
| Briefings | Magazin-Fassungen | Live |
| Chat | Mehrturn über Signale, Waves, Foresight | Live |
| Quellen | RSS an- und abschalten, einzelnen Feed holen | Live |
| Tagespuls | Rising, Watchlist, Brücke; kopierbarer Text | Live |
| MCP | Health, Signale, Waves, Research-Ask, Briefing, Ingest und Tick mit Bestätigung | Live |
| Knowledge Pack | Facette `market_intelligence` (Kurzfassung, Themen, Briefing-Refs, Wave-Highlights) | Teilweise: Plexon-Seite akzeptiert; Publish-SoT in ECHON-Repo nicht vollständig |
| Wave-Forecast (TimesFM), Galaxy-Ansicht | — | Spec / verworfen |

Quellen: `msqdx-echon/v3/specs/domain/capabilities.md`, `market-intelligence.md`, `foresight.md`, `plexon-v3/specs/domain/echon-collection-binding.md`, `assistant-echon-mcp.md`.

---

## SPIRION (mitgeführt)

Nicht in der Auftragsliste, aber in der Registry und beim Collection-Anlegen gespiegelt. Liefert Design-Referenzen (Screens, Captures, Prompt-Packs) an den Assistant und an CREATION-Szenen. Welle 1 der Plexon-Anbindung ist lesend. Kampagnen-Motiv-Korpus ist Backlog.

Quelle: `specs/domain/assistant-spirion-mcp.md`, `knowledge/spirion-mcp-assistant.md`.

---

## Was die Suite bewusst nicht ist

- Kein zweites Projekt pro App.
- Kein Ranking-Versprechen und keine vermischten GEO-Schichten (Model memory bleibt getrennt von Live search).
- Kein Power-BI-Ersatz, keine Client-Formel als Wahrheit.
- Kein vollständiger Dump von Dossiers, Scans oder Marken-PDFs in den Knowledge Pack.
- Persona-Chat bleibt in AUDION; der Plattform-Assistant orchestriert.
- Detection Lab, Checkion-Journey-UI und Checkion-Reports-Magazin sind keine Produktreisen.

## Pflege

Diesen Stand neu screenen, wenn eine App eine Hub-Fläche dazubekommt oder eine **Spec**-Zeile auf **Live** wechselt. Marketing-Handover: [`handover/suite-knowledge-base.md`](handover/suite-knowledge-base.md) verweist hierher; die App-Rollen dort sind Kurzfassung, der Ist-Stand steht in dieser Datei.

Enterprise-Wellen (Lagebild, Kundenraum, Gegentest, Audit, Launch-Gate, Kampagnenbrief): [`suite-enterprise-program.md`](suite-enterprise-program.md) und `specs/domain/suite-enterprise-program.md`.
