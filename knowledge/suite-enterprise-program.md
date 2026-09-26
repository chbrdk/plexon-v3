# Suite Enterprise Program — Wissen

**Spec:** `specs/domain/suite-enterprise-program.md`  
**Stand:** 2026-09-25 — E1–E9 Surfaces in Plexon; Produkt-Audit/Activity-Clients live; Staging-Env Schedule gesetzt.

## Fortschritt

| Welle | Stand |
|---|---|
| E1 Lagebild | Team, Aktivität (Flows + Destillate), Capability-Panes; Activity-Ingest API |
| E2 Kundenraum | API/DB live; Collection-Home UX deferred — Share-Links-Hub (`collection-share-links.md`) |
| E3 Termin/Gegentest | CHECKION Delta; `retest`; Flow-Schedule-Scheduler live (Env Staging) |
| E4 Audit | Session/Service-Ingest; Flow `run_finished`; Produkt-Clients |
| E5 Gates | Fix-Retest / Launch-Gate im Katalog; Slot-Publish bei `quality_ok` |
| E6 Persona×Seite | AUDION-Pane → Assistant-Draft `persona_page_relevance` |
| E7 Kampagnenbrief | CRUD + Assistant `campaign_brief_list` / `campaign_brief_create` |
| E8 Wettbewerb/Krise | Wettbewerbsraum-Band; Krisenvorlage im Flow-Katalog |
| E9 Directory | Admin-Panel + API-Stub; IdP-Laufzeit bewusst später |

### E2 Produkt-Slot-Matrix (2026-09-25)

| Slot | App | Trigger |
|---|---|---|
| `quick_check` | Plexon | EQC Share anlegen |
| `checkion_overview` | CHECKION | `POST /api/projects/:id/client-room/publish` |
| `brand_findings` | BRANDION | `POST /api/projects/:id/client-room/publish` |
| `creation_pages` | CREATION | Client Page Share `approve` |
| `metron_dashboard` | METRON | Dashboard Share (neu / `clientRoom: true`) |
| `videon_cut` | VIDEON | `POST /api/cuts/:id/client-room-approve` (+ Brand-Gate) |

## Migrationen (Staging/Prod-DB)

1. `lib/db/migrations/0020_suite_enterprise_client_room_audit.sql`
2. `lib/db/migrations/0021_suite_enterprise_activity_brief_directory.sql`
3. `lib/db/migrations/0022_collection_share_links.sql`

## Env (plexon-v3 Staging)

Gesetzt via Coolify API (App `plexon-v3:main-app`):

- `PLEXON_FLOW_SCHEDULE_ENABLED=1`
- `PLEXON_FLOW_SCHEDULE_INTERVAL_MS=60000`
- `PLEXON_OUTBOX_DRAIN_ENABLED=1`

Restart nötig, damit Runtime die Keys liest. Code-Deploy bringt Scheduler erst nach Merge/Deploy.

## Lesereihenfolge

1. `knowledge/suite-funktionsstand.md`
2. `knowledge/suite-agentur-use-cases.md`
3. `specs/domain/suite-enterprise-program.md`
4. Dieselbe Datei im Produkt-Repo, bevor eine Welle dort angefasst wird.
