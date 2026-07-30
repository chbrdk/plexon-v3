# Exyte SEO Brief — Abgleich mit MSQDX Tooling (PLEXON, CHECKION, AUDION)

**Quelle:** SEO Agency Brief, Exyte, 20. April 2026 (13 Seiten)  
**Stand der Analyse:** 26. Mai 2026  
**Ziel:** Prüfung, inwieweit das bestehende MSQDX-Ökosystem die Erwartungen aus dem Exyte-Brief abdeckt — und wo Lücken, Agency-Leistungen oder Produktentwicklung nötig bleiben.

---

## 1. Executive Summary

| Dimension | Bewertung |
|-----------|-----------|
| **Technisches SEO (Crawl, On-Page, Performance, Sicherheit)** | **CHECKION deckt einen Großteil ab** — Domain-Deep-Scan, Meta/Canonical/Redirects, PageSpeed, SSL, Link-Audit |
| **Content-SEO & Keyword-Strategie** | **Teilweise** — On-Page-Analyse, Keyword-Dichte, AI-Vorschläge, Rank-Tracking (Serper); kein redaktioneller Workflow |
| **GEO / AI-Sichtbarkeit** | **Stark (CHECKION)** — über klassisches SEO-Briefing hinaus; für Exyte relevant, wenn „AI Answers“ mitgedacht werden |
| **Reporting & Reifegrad-Framework** | **Lücken** — keine GSC/GA4/GTM-Anbindung, kein festes Reporting-Template, kein SEO-Playbook im Produkt |
| **CMS / Sitecore & Enablement** | **Nicht abgedeckt** — keine Sitecore-Integration; Guardrails/Playbook müssten erstellt und gepflegt werden |
| **PLEXON** | **Orchestrierung & Governance**, kein SEO-Tool |
| **AUDION** | **Personas & Journeys**, SEO nur indirekt über CHECKION-Site-Topics |

**Kernaussage:** CHECKION kann einen **technisch-analytischen SEO-Audit** und **laufendes Monitoring** substanziell unterstützen. Was Exyte explizit von einer **Sitecore-nativen Agency** erwartet — Strategie, Playbook, GSC/GA-Fehleranalyse, redaktionelle Einbettung, RACI-Handover — liegt **überwiegend außerhalb** des aktuellen Produktumfangs und braucht Prozess, Dokumentation und ggf. Agency.

---

## 2. Exyte-Anforderungen (strukturiert aus dem Brief)

### 2.1 Ausgangslage (Background)

| Problem bei Exyte | Relevanz für Tooling |
|-------------------|----------------------|
| SEO fragmentiert, „Content first, SEO later“ | Braucht **Playbook + Workflow-Einbettung** (Prozess, nicht nur Tool) |
| Kein SEO-Playbook im Editorial | **Nicht in Tools** — Dokument/Template nötig |
| Inkonsistente Editor-Praktiken | **Checklisten/Guardrails** + optional automatisierte Checks vor Publish |
| Keine Strategie, Benchmarks, Reporting-Cadence | **Reporting-Framework** + wiederkehrende Metriken |
| Wenig technisches SEO-Know-how im Team | **Diagnose-Tools + verständliche Reports** (CHECKION-Stärke) |

### 2.2 Problem Statement (Kernherausforderungen)

| Herausforderung | Was Exyte braucht |
|-----------------|-------------------|
| Kein zentrales SEO-Playbook (Standards, Checklisten) | Dokumentation, Schulung, ggf. CMS-Felder |
| SEO nicht in Content-Workflows verankert | Redaktionsprozess + Pre-Publish-Checks |
| Keine Transparenz **technisches SEO** (URLs, Redirects, tote Links, Canonical) | Crawl + technische Reports |
| Keine Transparenz **Front-end SEO** & Tool-Nutzung | On-Page-Scores, Rankings, Schulung |
| Unklare Priorisierung & Operating Model | Roadmap, RACI, Audit → Strategie |

### 2.3 Erwartungen an die Agency

| Erwartung | Abdeckung durch MSQDX-Tools |
|-----------|----------------------------|
| Umfassender SEO-Audit (Exyte + Exentec), page-level + technical | **CHECKION: hoch** (Crawl, On-Page, Rollups) |
| Reifegrad, Issues, Risiken, Priorisierung | **CHECKION: mittel-hoch** (Scores, Issue-Gruppen); Priorisierung/Strategie manuell |
| Kritische Fehler in **GSC, GTM, GA, Page Speed** | **Page Speed: ja** (PageSpeed Insights); **GSC/GTM/GA: nein** |
| SEO-Strategie mit Maßnahmen | **Prozess/Agency** — Tools liefern Daten, keine Strategie-PPT |
| Technische SEO-Empfehlungen inkl. Google-Themen | Teilweise (Performance, Indexability); GSC-Daten fehlen |
| SEO-getriebene Content-Erstellung (skalierbar) | **AUDION** für Zielgruppen/Message; **CHECKION** für Themen/Keywords — kein CMS-Editor |
| Keyword Research & Priorisierung | **CHECKION: mittel** (AI-Suggest, Rank-Tracking, On-Page-Keywords) |
| Reporting-Framework für interne Teams | **CHECKION: teilweise** (PDF, Projekte, Historie); kein Standard-Template wie im Brief |
| **Sitecore-native** oder Partner | **Nicht abgedeckt** |
| Enablement: Dokumentation, Guardrails | **Produktübergreifend zu erstellen** |
| Handover: intern vs. Agency | **Organisatorisch** — Tools können RACI-Tabelle speisen |

### 2.4 Non-Goals & Grenzen (Brief)

| Grenze | Konsequenz für Tooling |
|--------|------------------------|
| Fokus Diagnose/Strategie, nicht reine Checkliste | CHECKION passt (tiefere Scans + AI-Summary); Playbook trotzdem sinnvoll |
| Zugriff Sitecore, GSC, CMS | Agency/IT; CHECKION braucht **öffentliche URLs** (+ optional API-Keys für Serper/LLM) |
| Content-Produktion out of scope | AUDION/CHECKION **beraten**, ersetzen keine Redaktion |
| Technische Umsetzung mit IT | CHECKION **identifiziert**, fixt nicht in Sitecore |

### 2.5 Gewünschte Outcomes

| Outcome | Tool-Beitrag |
|---------|--------------|
| Gemeinsames Verständnis SEO-Reife | Domain-Scan + Projekt-Dashboards |
| Umsetzbarer Roadmap | Export/Issues → manuell priorisieren |
| Internes Reporting mit Confidence | Rank-Tracking + wiederkehrende Scans; GSC-Integration fehlt |
| Interne Capability | Schulung + MCP/Board für Power-User |
| Bessere technische SEO-Performance | Messbar via Re-Scans, PageSpeed, Issue-Counts |

---

## 3. Produktrollen im Ökosystem

```
┌─────────────────────────────────────────────────────────────────┐
│  PLEXON — Plattform (Identity, Projekte, Usage, Produkt-Hub)   │
│  • Kein natives SEO                                             │
│  • Federated Launch → CHECKION / AUDION                         │
│  • Board + MCP: CHECKION/AUDION Tools orchestrieren             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────┐                 ┌───────────────────┐
│  CHECKION         │                 │  AUDION           │
│  SEO/GEO/A11y/UX  │◄── site topics ─│  Personas/Journeys│
│  Audits, Rankings │                 │  Chat, Research   │
└───────────────────┘                 └───────────────────┘
```

---

## 4. Detaillierter Feature-Abgleich

### 4.1 CHECKION — primäres SEO-Instrument

| Exyte-Anforderung | CHECKION-Funktion | Abdeckung | Anmerkung |
|-------------------|-------------------|-----------|-----------|
| Page-level SEO Audit | Single-Page-Scan: Title, Meta, H1, OG, robots, Schema | ✅ Hoch | Pro URL, Multi-Device |
| Technical SEO Audit | Domain Deep Scan: Crawl, Canonical, hreflang, Redirects, tote Links, Sitemap | ✅ Hoch | `redirectCount`, Link-Audit, SEO-Rollups |
| SEO-Reife / Maturity | Domain Summary, SEO On-Page Score (Projekt), WCAG/Perf-Rollups | ⚠️ Mittel | Kein explizites „Maturity Model“-Template |
| Page Speed | Lab-Metriken im Scan + Tool PageSpeed Insights | ✅ Hoch | Entspricht Brief-Erwähnung |
| Google Search Console | — | ❌ Fehlt | Kritische Brief-Lücke |
| Google Analytics / Tag Manager | — | ❌ Fehlt | Kritische Brief-Lücke |
| Keyword Research & Priorisierung | Project Research Agent, suggest-keywords, Rank Tracking (Serper), Intent-Compare | ⚠️ Mittel | Kein klassisches Keyword-Volume-Tool (Ahrefs/Semrush) |
| Rankings / SERP | Rank Tracking, Multi-Market, Competitor-Positionen | ✅ Hoch | Abhängig von Serper-API, Top ~100 |
| Content-SEO Signale | Keyword-Dichte, Skinny Content, Freshness, Klassifikation | ✅ Hoch | Kein Content-Editor |
| Wettbewerb | Competitor Deep Scans, Page Topics Compare, GEO Competitive Benchmark | ✅ Hoch | Über Standard-SEO-Brief hinaus |
| GEO / AI-Sichtbarkeit | GEO-Score, llms.txt, E-E-A-T intensiv | ✅ Hoch | Brief fokussiert klassisches SEO; Exyte-Nutzen optional |
| Reporting Cadence | History, PDF (Single-Scan), Share Links, Projekt-Views | ⚠️ Mittel | Kein monatliches Standard-Reporting-Template |
| Accessibility (oft mit SEO verkoppelt) | WCAG axe/htmlcs, Domain WCAG View | ✅ Hoch | Nicht im Brief, aber Stakeholder-relevant |
| Automatisierung / Agenten | MCP (40+ Tools), PLEXON Board + CHECKION MCP | ✅ Hoch | Rank-Tracking nicht in MCP |
| Sitecore / CMS | — | ❌ Fehlt | Agency-Erwartung |

**CHECKION Scan-Modi (Mapping):**

| Modus | Exyte-Nutzen |
|-------|----------------|
| Single-Page Scan | Stichproben, Landingpages, Pre-Launch-Check |
| Domain Deep Scan | **Kern des technischen Audits** (beide Websites) |
| GEO/E-E-A-T intensiv | Zusatz „AI Search“-Positionierung |
| UX Journey Agent | User Flows, nicht klassisches SEO |

### 4.2 PLEXON — Steuerung, nicht SEO

| Exyte-Anforderung | PLEXON-Funktion | Abdeckung |
|-------------------|-----------------|-----------|
| Zentrale Identität / Teams | Auth, Orgs, Entitlements, Platform Projects | ✅ Für Betrieb |
| SEO-Audit | — | ❌ Native |
| Projekt-übergreifende Insights | Scan-Counts, Persona-Counts pro Platform Project | ⚠️ Aggregat, keine SEO-KPIs |
| Tool-Orchestrierung | Board + Claude + CHECKION/AUDION MCP | ✅ Für Power-User |
| Usage / Kostensteuerung | Token-Billing für Scans (inkl. `serp_refresh`, `geo_eeat`) | ✅ Governance |
| SEO-Playbook | — | ❌ |

### 4.3 AUDION — Zielgruppe & Content-Richtung, kein SEO-Tool

| Exyte-Anforderung | AUDION-Funktion | Abdeckung |
|-------------------|-----------------|-----------|
| SEO-getriebene Content-Erstellung | Personas, Chat, Journeys aus Research | ⚠️ Indirekt (Message/UX, nicht Meta-Tags) |
| Keyword-/Themen-Input | CHECKION Site Topics via `checkion_project_id` | ⚠️ Braucht verknüpftes CHECKION-Projekt |
| Technisches SEO | — | ❌ |
| Analytics (GA4) für Journeys | `AnalyticsIntegrationService` | ❌ Stub/TODO |
| Browser-Validierung | UX Journey Agent, `inspect_website` in Chat | ✅ UX, nicht SEO |
| Reporting SEO | — | ❌ |

---

## 5. Matrix: Brief-Kapitel → Tools

| Brief-Thema | CHECKION | PLEXON | AUDION | Agency/Prozess |
|-------------|----------|--------|--------|----------------|
| Technischer SEO-Audit | ✅ | — | — | Sitecore-Validierung |
| Page-level SEO | ✅ | — | — | — |
| GSC / GA / GTM Fehler | ❌ | ❌ | ❌ | ✅ Agency + Google-Zugang |
| Page Speed | ✅ | — | — | — |
| Keyword-Strategie | ⚠️ | — | ⚠️ (Topics) | ✅ Strategie-Workshop |
| SEO-Playbook | ❌ | ❌ | ❌ | ✅ Deliverable |
| Redaktions-Workflow | ❌ | ❌ | ❌ | ✅ + Sitecore |
| Reporting-Template | ⚠️ | ⚠️ (Usage) | ❌ | ✅ |
| Sitecore-Expertise | ❌ | ❌ | ❌ | ✅ Pflicht laut Brief |
| Enablement / Schulung | ⚠️ (MCP, Docs) | ⚠️ | ⚠️ | ✅ |
| RACI / Handover | — | — | — | ✅ |
| GEO / LLM-Sichtbarkeit | ✅ | — | — | Optional vs. Brief |

**Legende:** ✅ gut abgedeckt · ⚠️ teilweise · ❌ nicht abgedeckt

---

## 6. Konkrete Lückenliste (priorisiert)

### P0 — Blocker gegenüber Exyte-Brief (ohne Agency schwer zu schließen)

1. **Keine Google Search Console / Analytics / Tag Manager Integration** — Brief nennt diese explizit bei „kritischen Fehlern“.
2. **Kein Sitecore-Bezug** — Brief verlangt „Sitecore native or partner“.
3. **Kein SEO-Playbook / Guardrails für Redakteure** — zentrales Problem im Brief, rein prozessual.
4. **Kein definiertes Reporting-Framework** (Impact, Cadence, Template für interne Teams).

### P1 — Mit CHECKION gut lösbar, aber Lücken im Produkt

5. **Rank-Tracking nicht über MCP** — Automation für Agenten-Workflows eingeschränkt.
6. **Kein Keyword-Volume / Difficulty** (Drittanbieter-API) — „Priorisierung“ bleibt manuell.
7. **GEO-PDF / einheitlicher Executive Report** für Domain-Audits fehlt teilweise.
8. **Kein Pre-Publish-Hook in Sitecore** — CHECKION arbeitet post-hoc auf URLs.

### P2 — Strategisch / Nice-to-have

9. **Backlinks / Domain Authority** — nicht im Stack.
10. **AUDION Analytics-Anbindung (GA4/Hotjar)** — für Journey-„Reality Tracking“, nicht klassisches SEO.
11. **Content-Kalender / Editorial** — out of scope laut Brief, in Tools nicht vorhanden.

---

## 7. Empfohlenes Vorgehen für Exyte-ähnliche Engagements

### Phase A — Diagnose (CHECKION-first)

1. **Platform Project** in PLEXON anlegen; CHECKION- + optional AUDION-Projekt spiegeln.
2. Pro Domain (**exyte.com**, **exentec.com** o. ä.): **Domain Deep Scan** starten.
3. Ergänzend: **Single-Page-Scans** für Top-Landingpages aus Analytics (manuell aus GA exportiert, bis Integration fehlt).
4. **Rank Tracking** mit initialen Keywords (AI-Suggest + Workshop-Liste), Märkte per `gl`/`hl`.
5. Optional: **GEO/E-E-A-T** Scan wenn AI-Sichtbarkeit Teil der Strategie wird.

### Phase B — Strategie & Enablement (Agency + MSQDX)

6. Agency liefert: Reifegradmodell, priorisierte Roadmap, **Sitecore-Feld-Mapping**, Playbook.
7. MSQDX liefert: wiederkehrende **CHECKION-Projekt-Dashboards**, Share-Links für Stakeholder, MCP für technisches Team.
8. **AUDION** optional: Personas/Journeys aus CHECKION Site Topics + Research — für Content-*Richtung*, nicht für Meta-Tags.

### Phase C — Betrieb (intern)

9. Monatlich/quartalsweise: Rank-Refresh, Domain-Scan-Re-Run, PageSpeed-Stichproben.
10. Reporting: bis GSC-Integration existiert — **hybrid** (GSC-Export manuell + CHECKION-Metriken).

---

## 8. Was wir Exyte / einer Agency konkret anbieten können

| Leistung | Mit MSQDX möglich? |
|----------|-------------------|
| Technisches & on-page SEO-Audit (crawl-basiert) | **Ja (CHECKION)** |
| Performance / SSL / Sicherheits-Signale | **Ja (CHECKION)** |
| Keyword-Monitoring & SERP-Vergleich Wettbewerb | **Ja (CHECKION + Serper)** |
| AI/GEO-Sichtbarkeitsanalyse | **Ja (CHECKION)** |
| Persona- & Journey-Validierung für Content | **Ja (AUDION)** |
| Zentrale Plattform, Teams, Usage | **Ja (PLEXON)** |
| GSC/GA/GTM-Fehleranalyse | **Nein** (ohne Integration/Agency) |
| Sitecore-SEO-Strategie & CMS-Felder | **Nein** |
| SEO-Playbook & redaktionelle Guardrails | **Nein** (Dokument-Projekt) |
| Offizielles Agency-Substitut laut Brief | **Teilweise** — CHECKION ersetzt nicht Sitecore-Agency |

---

## 9. Produkt-Roadmap-Empfehlungen (falls Exyte-Use-Case strategisch)

| Priorität | Feature | Nutzen für Brief |
|-----------|---------|------------------|
| P0 | GSC API (Search Analytics, Coverage, Enhancements) | Direkte Brief-Anforderung |
| P0 | Export „SEO Audit Report“ (Domain, PDF/HTML, Executive Summary) | Reporting-Framework |
| P1 | Playbook-Templates (checklist JSON + Scan-Gates) | „SEO at publish“ |
| P1 | GA4 Data API (Landingpages, Conversions) — nur Lesen | Priorisierung |
| P2 | Rank-Tracking in MCP | Automation |
| P2 | Sitecore-Webhook oder Publish-URL-Queue | Workflow-Einbettung |

---

## 10. Anhang — CHECKION-Funktionen nach Brief-Kategorie

### Technisches SEO
- Domain Crawl, Sitemap, robots.txt
- Canonical, hreflang, Duplicate-URLs
- Redirect chains (`redirectCount`)
- Broken links (intern/extern)
- Indexability (noindex, etc.)
- Security headers, HTTPS
- SSL Labs (Tool)
- PageSpeed Insights (Tool)

### Content / On-Page SEO
- Title, Meta, H1, Heading-Struktur
- OG/Twitter, Structured Data Gaps
- Keyword-Analyse (DE/EN Stopwords)
- SEO On-Page Score (Projekt)
- Content Freshness
- Page Classification (LLM) & Page Topics Compare

### Messung & Wettbewerb
- Rank Tracking (Serper, Multi-Market, Intent)
- Competitor SERP-Positionen
- Domain vs. Competitor Summaries
- Deep Scan Compare

### Nicht SEO, aber Brief-nah
- WCAG / Accessibility
- UX Check (ISO 9241-110), Saliency, Journey Agent
- Privacy / Consent Signals

### MCP (Auszug, vollständig: `CHECKION/mcp-server/README.md`)
Scans, Domain, GEO, Projects, Tools (contrast, pagespeed, ssl, wayback), Share, Search — **ohne** Rank-Tracking.

---

## 11. Referenzen

| Ressource | Pfad |
|-----------|------|
| Exyte Brief (PDF) | `/Users/christoph.bordeck/Downloads/SEO_Agency_Exyte.pdf` |
| CHECKION Funktionen | `CHECKION/knowledge/checkion-funktionen-und-use-cases.md` |
| CHECKION Feature Register | `CHECKION/knowledge/feature-register.md` |
| PLEXON Surface Ownership | `PLEXON/knowledge/platform-surface-ownership.md` |
| AUDION Ökosystem | `AUDION-v2/knowledge/audion-oekosystem-one-pager.md` |
| CHECKION Site Topics → AUDION | `AUDION-v2/knowledge/checkion-site-topics.md` |

---

*Dieses Dokument dient als interne Gap-Analyse und Gesprächsgrundlage mit Stakeholdern (Exyte, Agency-Auswahl, Produktpriorisierung). Es ersetzt keine rechtliche oder vertragliche Leistungszusage.*
