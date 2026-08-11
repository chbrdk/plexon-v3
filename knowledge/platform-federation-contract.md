# PLEXON Federation Contract

Stand: Mai 2026

## Ziel

`PLEXON` ist die zentrale Control Plane fuer Identitaet, Profil, Usage/Billing und Produkt-Registry. `CHECKION`, `AUDION` und spaetere Produkte bleiben fachlich eigenstaendig und integrieren sich ueber einen gemeinsamen Plattformvertrag.

## Aktuelle Vertragsversion

- **Version (Prod / v2-Spur):** `2026-05-plexon-federation-v2`
- **Version (v3-Parallelspur):** `2026-05-plexon-federation-v3` — AUDION-v3; weitere Products folgen
- **Request-Header:** `X-Plexon-Contract-Version`
- **Service-Authentifizierung:** `X-Service-Secret`
- **Response-Header:** `X-Plexon-Contract-Version`

Die Version wird von `PLEXON` in Service-Antworten gesetzt. Products schicken dieselbe Vertragsversion in ihren Plattform-Requests mit.

**Ops / Coolify v3-Insel:** `knowledge/ecosystem-v3-parallel-track.md` · `knowledge/coolify-v3-staging-runbook.md`

## Kern-Endpunkte in PLEXON

### Identity

- `POST /api/auth/validate-credentials`
- Zweck: Credentials gegen die zentrale PLEXON-User-DB validieren
- Nutzerfuehrung: Produkte koennen denselben Login verwenden, ohne eigene zentrale User-DB zu fuehren

### Profile

- `GET /api/services/profile?user_id=...`
- `GET /api/services/profile?email=...`
- `PATCH /api/services/profile`
- Zweck: zentrale Profilfelder lesen und schreiben

### Usage

- `POST /api/services/usage/events`
- Zweck: produktlokale Nutzungsereignisse in zentrale Tokens/Abrechnung ueberfuehren
- Anforderungen:
  - idempotente Event-Schluessel unterstuetzen
  - keine hardcodierten Produkt-URLs ausserhalb der Registry

### Product Registry

- `GET /api/platform/products`
- Zweck: foederierte Produktmetadaten und Runtime-Status fuer Dashboard, Produktkatalog und spaetere Plattform-Surfaces

### Collection Knowledge Pack (v3, implemented)

- `GET/PUT/PATCH /api/platform/projects/:platformProjectId/knowledge…`
- `POST …/knowledge/facets/:facetId/publish` · `POST …/knowledge/suggest`
- Zweck: facetierte Shared Briefs pro Collection (nicht Tenant-Company-Default)
- **Nicht** Teil des thin Project-Upserts (`PUT …/provisioning/projects/{id}`)
- Sync-Vertrag (Pull/Publish Audion+Checkion): `knowledge/collection-knowledge-sync.md`
- Spec: `specs/domain/collection-knowledge-pack.md` · `specs/api/collection-knowledge-pack.md`

### Collection lifecycle (v3)

- Archive/restore: PLEXON `PATCH` status → product upsert `status: active|archived` (thin PUT provisioning).
- Hard-delete: PLEXON admin only after archive fan-out; product mirrors remain archived (no provisioning DELETE yet).
- Spec: `specs/domain/collection-projects.md` Phase 5 · `knowledge/platform-projects-central-creation.md`

## Produkt-Registry

Die Registry in `PLEXON/lib/platform-products.ts` ist die zentrale Quelle fuer:

- Produkt-ID
- Anzeigename
- Lifecycle (`active`, `planned`)
- Surface-Typ (`native`, `federated`)
- Einstiegspunkt
- Login-URL
- Health-URL
- Deep-Link-Einstiege
- Plattform-Faehigkeiten

Neue Produkte werden nicht mehr per Sonder-UI eingebaut, sondern durch Registry-Eintraege plus Knowledge-Dokumentation angeschlossen.

## Deep-Link-Konventionen

### CHECKION

- Start: `/`
- Scan: `/scan`
- Projekte: `/projects`
- Einstellungen: `/settings`

### AUDION

- Admin: `/admin`
- Personas: `/admin/personas`
- Projekte: `/admin/projects`
- Chat: `/chat`

Deep Links muessen stabil, bookmark-faehig und produktlokal aufloesbar bleiben. `PLEXON` speichert keine fachlichen Produktdaten, sondern nur Einstiegskonventionen.

## Sicherheitsgrenzen

- Service-Routen in `PLEXON` akzeptieren nur Requests mit `X-Service-Secret` oder Bearer-Aequivalent.
- Administrative Proxy-Routen zu `CHECKION` sind nur fuer PLEXON-Admins erlaubt.
- Produktdaten bleiben produktlokal; `PLEXON` sieht nur Querschnittsinformationen.
- Redirect-Ziele muessen aus der Registry oder expliziten Allowlists kommen.

## Nicht-Ziele

- Keine gemeinsame Produktdatenbank
- Kein gemeinsames Cookie-Modell ueber denselben Host in der ersten Ausbaustufe
- Kein Voll-Rewrite von `CHECKION` oder `AUDION` in `PLEXON`

## Relevante Dateien

- `PLEXON/lib/platform-contract.ts`
- `PLEXON/lib/platform-products.ts`
- `PLEXON/app/api/platform/products/route.ts`
- `PLEXON/app/api/auth/validate-credentials/route.ts`
- `PLEXON/app/api/services/profile/route.ts`
- `PLEXON/app/api/services/usage/events/route.ts`
- `CHECKION/lib/plexon-contract.ts`
- `AUDION-v2/apps/web/lib/plexon-contract.ts`
- `audion-v3/apps/web/lib/plexon-contract.ts` (Contract v3)
- `knowledge/coolify-v3-staging-runbook.md`
