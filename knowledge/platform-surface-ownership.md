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
- spaeter: globale Suche, zentrale Boards, letzte Aktivitaeten, Read-only-Summaries

## Was bleibt produktlokal

### CHECKION

- Scan-Launcher
- Deep-Scan-Ergebnisse
- Projekt-Workspaces
- GEO / E-E-A-T
- Rank Tracking
- MCP Server und produktlokale Tool-APIs

### AUDION

- Persona-Admin
- Projekte, Target Groups, Journeys
- BFF-/Proxy-Schicht im Next-Web
- Chat- und Voice-Flows
- Multi-Service-Runtimes (`api`, `chat-api`, `indexing-api`, Worker)

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

Jedes neue Produkt, z. B. `VIDEON` oder `BRANDION`, braucht vor Aufnahme in die Registry:

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
