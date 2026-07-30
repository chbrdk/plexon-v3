# PLEXON Federation Ops and Test Gates

Stand: Mai 2026

## Betriebsmodell

Die bevorzugte Zielarchitektur ist **subdomains-first**:

- `PLEXON` unter eigener Control-Plane-Domain
- `CHECKION` unter eigener Produkt-Domain/Subdomain
- `AUDION` unter eigener Produkt-Domain/Subdomain
- spaetere Produkte analog

Ein gemeinsames Pfadmodell unter einem Host bleibt optional und wird erst nach erfolgreicher Session-, Redirect- und Base-Path-Haertung bewertet.

## Deployment-Reihenfolge

1. `PLEXON` Vertrag, Registry und Security stabilisieren
2. `CHECKION` gegen den Vertrag haerten
3. `AUDION` gegen den Vertrag haerten
4. Deep Links, Return-Navigation und Produktstatus sichtbar machen
5. Erst danach weitere Produkte anschliessen

## Health-Checks

Jedes foederierte Produkt braucht:

- oeffentliche oder intern aufloesbare Health-URL
- definierte Login-URL
- definierte Haupt-Einstiegs-URL
- dokumentierte MCP-URL, falls vorhanden

Bevorzugte Health-Endpunkte:

- `PLEXON`: `/api/health`
- `CHECKION`: `/api/health`
- `AUDION` Web: `/api/health`

## Secrets und Environment

Plattformkritische Variablen:

- `PLEXON_SERVICE_SECRET`
- `CHECKION_API_URL`
- `CHECKION_ADMIN_API_KEY`
- `NEXT_PUBLIC_AUDION_ADMIN_URL`
- `NEXT_PUBLIC_CHECKION_URL`
- optional `NEXT_PUBLIC_VIDEON_URL`
- optional `NEXT_PUBLIC_BRANDION_URL`

Wichtig:

- Service-Secrets duerfen nicht produktspezifisch hardcodiert werden.
- Produkt-URLs gehoeren in zentrale Konfiguration und in die Knowledge-Dokumentation.
- Neue Produkte werden erst freigeschaltet, wenn URL, Login, Health und Vertragsversion dokumentiert sind.

## Rollout-Gates

Keine Phase gilt als abgeschlossen, solange die folgenden Tests nicht gruen sind.

### Contract-Tests

- `PLEXON` setzt Vertragsheader auf Service-Antworten
- `CHECKION` sendet Vertragsheader an PLEXON
- `AUDION` sendet Vertragsheader an PLEXON
- Usage-Events bleiben idempotent

### Integrations-Tests

- Login ueber zentrale Credentials funktioniert je Produkt
- Profil-Lesen und Profil-Patch funktionieren gegen PLEXON
- Admin-Proxy-Routen sind nur fuer PLEXON-Admins erreichbar

### Smoke-Tests

- `PLEXON` Dashboard laedt Produktstatus
- Produktkatalog zeigt Registry-Eintraege
- Deep Links aus `PLEXON` oeffnen die richtigen Produktbereiche
- Logout und Session-Ablauf fuehren nicht in Redirect-Loops

### Failure-Mode-Tests

- Downstream-Produkt nicht erreichbar
- fehlendes `X-Service-Secret`
- falsche Vertragsversion
- fehlende Produkt-URL / fehlende Health-URL

## Go/No-Go fuer spaetere Host-Konvergenz

Ein gemeinsamer Host mit Pfaden wird erst bewertet, wenn:

- Cookie-Namensraeume sauber getrennt oder zentralisiert sind
- `CHECKION` und `AUDION` base-path-stabil deploybar sind
- Redirects und Asset-Pfade unter Pfaden reproduzierbar funktionieren
- keine Session-Kollisionen mehr auftreten
