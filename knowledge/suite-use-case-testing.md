# Suite Use-Case Testing

**Stand:** 2026-09-26  
**Checkpoint:** [`suite-stand.md`](suite-stand.md)  
**Zweck:** Verifikation der Agentur-Ketten aus [`suite-agentur-use-cases.md`](suite-agentur-use-cases.md) und der Enterprise-Wellen aus [`specs/domain/suite-enterprise-program.md`](../specs/domain/suite-enterprise-program.md).  
**Staging-SSOT:** [`paths.md`](paths.md) — FQDN nur dort / Env-Keys, keine Hardcodes in Tests.

## Markierungen

| Mark | Bedeutung |
|---|---|
| **Live** | Staging mit Keys + Federation `live` liefert echte Läufe |
| **Fixture** | Bewusst Fixture/Demo-Daten; UI muss das kennzeichnen |
| **Demo** | Seed/Bootstrap (z. B. Vaillant MaFo), nicht Kundenwahrheit |
| **Geplant** | Spec oder Stub; kein Pass-Kriterium für Live |

Erlaubte Werte in dieser Datei und in Contract-Tests: genau diese vier.

## Preconditions (Staging)

- Plexon: `https://plexon-v3.projects-a.plygrnd.tech` (`PUBLIC_APP_URL` / `NEXTAUTH_URL`)
- Product companions laut `paths.md` (Checkion, Audion, Brandion, Creation, Videon, Metron, Echon)
- `DATABASE_URL`, `PLEXON_SERVICE_SECRET`, Product `*_FEDERATION_MODE=live` wo Destillate erwartet werden
- Flow schedule: `PLEXON_FLOW_SCHEDULE_ENABLED` (default on with DB)
- E2E: `E2E_BASE_URL`, `E2E_USER`, `E2E_PASSWORD` (Werte nur lokal/Coolify — nie committen)

## Matrix UC × Enterprise

| UC | Kern | E1 Lagebild | E2 Raum | E3 Schedule/Retest | E4 Audit | E5 Gate | E6 Persona×Seite | E7 Brief | E8 Wettbewerb/Krise | E9 Directory |
|---|---|---|---|---|---|---|---|---|---|---|
| UC1 Pitch | EQC + optional Personas | Live | — | — | Live nach Lauf | — | — | — | — | Geplant (Stub) |
| UC2 Retainer | Deep/GEO + Metron | Live Destillate | optional Slot | Live schedule+retest | Live | — | — | — | competitive Band | Geplant |
| UC3 Relaunch | Journey → **Single** (by design) | Live | — | — | Live | — | Live Deep-Link | — | — | Geplant |
| UC4 Marke | Brandion → Creation | Live | — | — | Live | brand_measure | — | optional | — | Geplant |
| UC5 Landing | Creation Share | Live Pane | Client share / Raum | — | Live published | — | — | sceneId | — | Geplant |
| UC6 Video | Videon Analyse | Live Pane | optional videon_cut | — | Live | — | — | mediaRefs | — | Geplant |
| UC7 Reporting | Metron Dashboard | Live | metron_dashboard Slot | — | Live | — | — | kpiRefs | — | Geplant |
| UC8 Wochenbriefing | Echon → Pack | Live Pane | — | — | — | — | — | marketRef | competitive Band | Geplant |
| UC9 Mandat | Collection + Flow + Team | Live | Live | Live | Live | Live Vorlagen | Live | Live CRUD | Live Vorlagen | Stub Live |

**By design (kein Härte-Bug):** Journey-Handoff startet nur CHECKION **Single**, nie Deep — siehe Checkion `audion-journey-scan-trigger.md`. Deep bleibt UC2.

## Pass/Fail pro Kette

### UC1 Pitch — Contract `suite-use-case-matrix` · E2E `uc1-pitch-eqc`

- Pass: `/event-quick-check` erreichbar; Collection-Kontext wählbar; Report-Fläche oder klarer Fixture-Hinweis.
- Fail: 5xx auf EQC-Route; Login blockiert ohne erwarteten Redirect.

### UC2 Retainer + E3 — E2E `e3-schedule-retest` · Unit schedule drain

- Pass: Flow mit `schedule` + `retest` speicherbar; Retest ohne Vorlauf → benannter Fehler; Activity/Audit nach Quality-Lauf wenn Federation live.
- Fail: Schedule-Node ohne Cron speichert still; Retest „grün“ ohne Delta-Quelle.

### UC3 Relaunch

- Pass: Journey → Single-Scan-Handoff; Study ohne Agent-URL zeigt **Fixture** (nicht Live).
- Fail: Deep aus Journey; Fixture als Live ausgegeben.

### UC9 + E5 Gate — E2E `uc9-lagebild-audit` · `e5-launch-gate`

- Pass: Collection-Home zeigt Capability-Panes (auch leer) + Activity-Band; Audit-Liste; Launch-Gate-Vorlage anlegbar; Gate ohne Messung nicht `passed`.
- Fail: Pane fehlt komplett; Gate ohne Messung als bestanden.

### E8 Krise

- Pass: Nur aus Vorlage `enterprise-crisis-v1`; unbound Capability → `skipped` + `skipReason` im Run.
- Fail: Freier Graph startet Krise; Skip ohne Grund.

### E9 Directory Stub

- Pass: Admin GET/PATCH; `ready: false`; Passwort disable ohne Provider → 400.
- Fail: Secrets in Panel-JSON; IdP als Live beworben.

## CI vs Staging

| Schicht | Was | Wo |
|---|---|---|
| Vitest contracts | Dateien, Vorlagen, Skip-Gründe, Destillat-Inventar, Playbook-Markierungen | `__tests__/suite-*.test.ts` · `__tests__/suite-use-case-matrix.test.ts` · `__tests__/suite-distillate-inventory.test.ts` · `__tests__/suite-enterprise-skip-e5-e8-e9.test.ts` |
| Playwright | UC1, UC9 (Panes + Audit/Activity), E2 ClientRoom API, Share-Links Hub, E3, E5 templateId, E8 Crisis templateId, E9 Directory-Stub | `e2e/…` · `npm run test:e2e:staging` · **2026-09-26: 13/13 grün** |
| Manuell | Cron-Tick abwarten, echte Deep/GEO-Keys | dieses Playbook |

## Härte-Backlog

| Item | Stand (2026-09-26) |
|---|---|
| Flow-Skip mit stabilem `skipReason` bei fehlender Capability | Done — Catalog `skipped` + Codes für Checkion/Audion/Videon/Retest (`collection-flow-skip.ts`) |
| CREATION/VIDEON/ECHON/SPIRION Pane-Einstieg auch ohne letzten Lauf | Done — `capability-entry-teaser` + Nav immer |
| AUDION Study Fixture-Label ohne Agent-URL | Done — `study-evidence-mode` + UI-Asserts |
| Destillat Call-Site Inventory in Product-Repos | Done — `knowledge/distillate-call-sites.md` + Contract-Tests |

## Explizit out of scope

- Power-BI-Parität, freies BI
- OIDC/SAML/SCIM-Laufzeit (E9 bleibt Stub)
- Prod control plane `chbrdk/PLEXON`
