# Suite Enterprise Program

**Status:** Accepted (program) — 2026-09-25. Keine Welle ist implementiert, bis ihre Acceptance in dieser Datei auf **Done** steht.  
**Owner:** PLEXON. Produktpflichten liegen in der jeweiligen App-Spec `specs/domain/suite-enterprise-program.md`.  
**Federation:** `2026-05-plexon-federation-v3`  
**Ist-Stand:** `knowledge/suite-funktionsstand.md`  
**Heutige Aufgaben:** `knowledge/suite-agentur-use-cases.md`  
**Wissen:** `knowledge/suite-enterprise-program.md`

## Zweck

Die Suite kann die Facharbeit. Enterprise heißt: ein Mandat wiederholt sich, eine Freigabe gilt über die Flächen, der Kunde sieht einen Stand. Dieses Programm schließt diese Ketten. Es erfindet keine zweite Projektart und keine freie BI-Fläche.

## Invarianten

1. Collection bleibt der einzige Projektbegriff.
2. Produkt Daten bleiben im Produkt. Plexon speichert Bindings, Destillate, Freigaben, Termine und das Audit.
3. Model memory und Live search bleiben getrennte GEO-Schichten.
4. KPI-Wahrheit bleibt serverseitig in METRON. Marken-Wahrheit bleibt in BRANDION. Persona-Chat bleibt in AUDION.
5. Ein Lauf ohne Beleg ist kein Bestehen. Brand-Check und Quality-Gates erfinden kein Pass.
6. Neue Knoten im Collection Flow sind geschlossene Kinds. Kein freier Code-Knoten.
7. Implementierung einer Welle startet mit der App-Spec und den Tests dieser Welle, nicht mit UI.

## Wellen

| Welle | Name | Owner | Abhängigkeit |
|---|---|---|---|
| E1 | Collection-Lagebild | Plexon | — |
| E2 | Kundenraum | Plexon + jede App, die Shares hat | E1 |
| E3 | Termin und Gegentest | Plexon Flow + CHECKION | E1 |
| E4 | Suite-Audit | Plexon + alle Apps | E1 |
| E5 | Launch-Gate und Fix-Kette | Plexon Flow + CHECKION, BRANDION, AUDION, CREATION | E3, E4 |
| E6 | Persona × Seite | bestehend: `persona-page-relevance-wave2.md` | CHECKION Corpus |
| E7 | Kampagnenbrief | Plexon Objekt; alle Apps lesen | E1, E4 |
| E8 | Wettbewerb und Krise | Plexon Flächen + ECHON, CHECKION, AUDION, CREATION, VIDEON, BRANDION | E7 |
| E9 | Firmendirectory | Plexon | — |

E6 ist bereits spezifiziert. Diese Datei bindet sie ein und schreibt sie nicht neu.

## E1 — Collection-Lagebild

**Status:** Done (2026-09-25) — Team-Panel, Aktivitätsband (Flows + Produkt-Destillate), Capability-Panes; `POST …/activity` Ingest. Product-Clients senden Destillate.

**Nutzer:** Projektleitung öffnet eine Collection und sieht Team, letzte Läufe und jede Capability.

**Plexon liefert**

- Mitglieder und Einladungen auf der Collection-Home (APIs existieren).
- Capability-Panes für CREATION, SPIRION, VIDEON, ECHON neben CHECKION, AUDION, BRANDION, METRON.
- Aktivitätsband: letzte Jobs als Destillat (Art, Status, Zeit, Deep-Link). Keine Roh-Dossiers.

**Acceptance**

- Collection-Home zeigt für eine gebundene Capability einen Einstieg, auch wenn der letzte Lauf leer ist.
- Einladung anlegen, annehmen und widerrufen ohne Admin-Umweg.
- Archivierte Collections verschwinden aus dem Lagebild.

## E2 — Kundenraum

**Status:** Done (2026-09-25) — `collection_client_rooms`, API, Panel, `/share/room/[token]`; Slot-Put Session + Service-Secret.

**Nutzer:** Ein externer Link zeigt den zuletzt freigegebenen Stand des Mandats.

**Objekt `ClientRoom`** (Plexon)

| Feld | Regel |
|---|---|
| `platformProjectId` | Pflicht |
| `token` | öffentlich, widerrufbar |
| `policy` | erbt die Company-Client-Share-Policy |
| `slots` | geschlossene Liste: `quick_check`, `checkion_overview`, `brand_findings`, `creation_pages`, `metron_dashboard`, `videon_cut` |
| `revision` | steigt, wenn ein Slot ersetzt wird |

Ein Slot zeigt nur ein Artefakt, das die Quell-App als **freigegeben** markiert hat. Ungelesene Entwürfe erscheinen nicht.

**Acceptance**

- Ein Raum, ein Token, Widerruf sperrt alle Slots.
- Leerer Slot bleibt leer, er zeigt kein Fixture.
- Passwort und TTL folgen der bestehenden Client-Share-Policy.

## E3 — Termin und Gegentest

**Status:** Done (2026-09-25) — `schedule` Cron-Runner (`lib/collection-flow-scheduler.ts`); CHECKION `/delta`; Plexon `runRetestSegment`.

**Nutzer:** Ein Flow läuft wieder, und ein CHECKION-Lauf vergleicht sich mit seinem Vorgänger.

**Neue Flow-Kinds** (geschlossen)

| Kind | Rolle |
|---|---|
| `schedule` | Cron-Ausdruck, Zeitzone, nächster Lauf. Kein zweiter Scheduler pro App. |
| `retest` | Wiederholt den vorherigen Quality-Lauf derselben Collection und schreibt `delta` in den Run-Katalog. |

`retest` ersetzt den Deep-Crawl nicht durch einen Single-Scan. Dieselbe Scan-Art, dieselbe URL-Menge, soweit der Vorlauf sie gespeichert hat.

**CHECKION liefert** den Vergleich Lauf gegen Vorlauf: neue, verschwundene, gleich gebliebene Befunde. Score-Delta pro Scoring-Art. GEO bleibt aus diesem Delta heraus, solange die Schichten nicht gleich sind.

**Acceptance**

- Ein gespeicherter Flow mit `schedule` läuft ohne geöffnete UI.
- `retest` ohne Vorlauf endet mit einem benannten Fehler, nicht mit einem leeren Erfolg.
- Zwei GEO-Schichten erzeugen zwei Deltas.

## E4 — Suite-Audit

**Status:** Done (2026-09-25) — `suite_audit_events` + Session/Service-Ingest; Flow-Worker schreibt `run_started`/`run_finished`; Produkt-Clients angebunden.

**Nutzer:** Für ein Mandat ist nachvollziehbar, wer welchen Lauf ausgelöst hat.

**Ereignis** (Plexon-Log, Append-only)

| Feld | Regel |
|---|---|
| `at` | Zeit |
| `actorUserId` | Session-Nutzer, nicht der Service-Token |
| `platformProjectId` | Pflicht |
| `productId` | `plexon` oder Capability |
| `action` | geschlossenes Verb: `run_started`, `run_finished`, `published`, `approved`, `revoked`, `exported` |
| `subjectRef` | Produkt-ID des Objekts, kein Payload-Dump |
| `modelRef` | optional, wenn ein Modell gerechnet hat |

Produkte senden das Ereignis an Plexon. Sie führen kein zweites suiteweites Log.

**Acceptance**

- Ein CHECKION-Lauf, eine BRANDION-Messung, ein METRON-Evaluate und ein CREATION-Share erscheinen im Collection-Audit mit dem handelnden Nutzer.
- Service-Secret ohne `actorUserId` wird abgelehnt.

## E5 — Launch-Gate und Fix-Kette

**Status:** Done (2026-09-25) — Vorlagen anlegbar; bei `quality_ok` wird `checkion_overview` im Kundenraum gesetzt (wenn Raum existiert).

**Zwei Flow-Vorlagen**, keine neuen Produkt-Engines.

**Fix und Gegentest:** CHECKION-Befund → Hinweis an CREATION (Deep-Link, keine Auto-Änderung) → `brand_measure` → `retest` → Delta im Kundenraum, wenn freigegeben.

**Launch-Gate:** `quality_ok` und `brand_measure` müssen bestehen. AUDION-Study ist optional und blockt nur, wenn der Flow sie als Pflicht markiert. `human_confirm` gibt den Kundenraum-Slot frei.

**Acceptance**

- Ein Gate ohne Messung endet offen, nicht bestanden.
- Die Vorlage ist aus dem Flow-Katalog anlegbar.
- CREATION ändert die Szene nicht, weil der Flow einen Befund gesehen hat.

## E6 — Persona × Seite

Unverändert `persona-page-relevance-wave2.md` / `assistant-persona-page-relevance.md`.

**Status:** Done (Lagebild 2026-09-25) — Collection AUDION-Pane verlinkt jede Persona per `pathAssistantWithProjectAndDraft` auf Intent `persona_page_relevance`. Flow-Node bleibt Wave-2 (`collection-flow-persona-page-node.md`).

**Acceptance (Enterprise)**

- Aus dem Collection-Lagebild öffnet ein Klick „Seiten für Persona“ den Assistant mit Collection-Kontext und Draft-Prompt.
- Kein zweites Ranking im Lagebild — Wahrheit bleibt der Assistant-Handler.
- Kein neuer Query-Param ohne Spec; `draft` ist das etablierte Muster (METRON).

## E7 — Kampagnenbrief

**Status:** Done (2026-09-25) — Tabelle + CRUD API + Assistant-Intents `campaign_brief_list` / `campaign_brief_create`.

**Objekt `CampaignBrief`** in der Collection. Alle Apps lesen, keine App speichert eine zweite Kopie als Wahrheit.

| Feld | Regel |
|---|---|
| `id`, `platformProjectId`, `title` | Pflicht |
| `marketRef` | ECHON-Destillat `market_intelligence`, optional |
| `personaRefs` | AUDION-IDs |
| `guidelineId` | aktive BRANDION-Guideline, optional |
| `pageRefs` | CHECKION-Seiten, optional |
| `sceneId` | CREATION, optional |
| `mediaRefs` | VIDEON, optional |
| `kpiRefs` | METRON, optional |
| `status` | `draft` \| `active` \| `closed` |

SPIRION-Referenzen hängen als lesende Links am Brief, nicht als eigene Guideline.

**Acceptance**

- Assistant und Flow dürfen einen Brief anlegen und lesen.
- Schließen eines Briefs löscht die Produktartefakte nicht.
- Service-Secret ohne `actorUserId` wird für Audit-Nebenwirkungen abgelehnt (wie E4).

## E8 — Wettbewerb und Krise

**Status:** Done (2026-09-25) — Krisenvorlage im Flow-Katalog; Wettbewerbsraum-Band auf Collection-Home (competitive + market_intelligence + AUDION-Persona-Ref). Keine neue Kennzahl.

**Wettbewerbsraum:** eine Collection-Ansicht aus `competitive`, `market_intelligence` und einer AUDION-Zielgruppen-/Persona-Referenz. Keine neue Kennzahl.

**Krisenvorlage:** `enterprise-crisis-v1` — Statement-Scan → Persona → `brand_measure` → `human_confirm`. Nur aus Vorlage anlegbar.

**Acceptance**

- Die Krise startet nur aus einer Vorlage, nicht aus einem freien Graphen.
- Fehlende Facetten bleiben leer (kein Fixture).
- Fehlende Capability wird als übersprungener Schritt mit Grund gezeigt (Laufzeit).

## E9 — Firmendirectory

**Status:** Admin-Stub Done (2026-09-25) — `company_directory_settings` + Admin API + Admin-Panel. OIDC/SAML/SCIM-Laufzeit ist bewusst **nicht** live: Passwort-Login bleibt, bis `ready` und Provider konfiguriert sind. Env-Keys für spätere IdP-Anbindung: `PLEXON_DIRECTORY_OIDC_*` / `PLEXON_DIRECTORY_SAML_*` (dokumentiert, optional).

Plexon akzeptiert Anmeldung über das Directory der Firma (OIDC oder SAML) und Mitgliederabgleich (SCIM). Produkt-Apps bleiben hinter der Plexon-Session.

**Acceptance (Stub)**

- Admin kann Provider und SCIM-Flag speichern; Passwort abschalten ohne Provider wird abgelehnt.
- Entitlement und Collection-Mitgliedschaft bleiben Plexon-Daten.
- Keine Secrets im Panel-Response (`config` bleibt serverseitig).

## Produktpflichten (Verweis)

| App | Spec |
|---|---|
| CHECKION | `checkion-v3/specs/domain/suite-enterprise-program.md` |
| AUDION | `audion-v3/specs/domain/suite-enterprise-program.md` |
| BRANDION | `brandion-v3/specs/domain/suite-enterprise-program.md` |
| CREATION | `creation-v3/specs/domain/suite-enterprise-program.md` |
| VIDEON | `videon-v3/specs/domain/suite-enterprise-program.md` |
| METRON | `metron-v3/specs/domain/suite-enterprise-program.md` |
| ECHON | `msqdx-echon/v3/specs/domain/suite-enterprise-program.md` |
| SPIRION | Abschnitt unten. Kein Produkt-Repo in diesem Workspace. |

## SPIRION

Welle E7: lesende Referenz-Links am Kampagnenbrief (`assistant-spirion-mcp.md`). Der Motiv-Korpus bleibt `spirion-campaign-motif-corpus.md` und ist keine eigene Enterprise-Welle.

## Verification

Playbook: `knowledge/suite-use-case-testing.md` (UC1–UC9 × E1–E9, Markierungen Live|Fixture|Demo|Geplant).  
CI: `__tests__/suite-enterprise-*.test.ts`, `__tests__/suite-use-case-matrix.test.ts`.  
Staging-E2E: `e2e/` + Env `E2E_BASE_URL` / `E2E_USER` / `E2E_PASSWORD` (siehe `knowledge/paths.md`).  
E9 bleibt Admin-Stub (`ready: false`); OIDC/SAML/SCIM ist Geplant, nicht Live.

## Nicht in diesem Programm

- Power-BI-Parität, Client-Formeln, Dashboard-Bau in CREATION.
- Detection Lab als Produktfläche.
- CHECKION-Journey-UI als zweite Study.
- Vermischen der GEO-Schichten.
- Automatisches Umschreiben einer CREATION-Szene aus einem Scan.
- Galaxy, TimesFM, Rank-Tracking als Versprechen.
- Firmendirectory-IdP-Laufzeit (E9 Stub only in dieser Tranche).
