# Suite-Stand (Checkpoint)

**Stand:** 2026-09-26 (Abend)  
**Zweck:** Einziger Einstieg für „wo stehen wir?“ in künftigen Chats. Kurz, prüfbar, verlinkt — keine Spec-Duplikate.  
**Aktualisieren:** nach jeder abgeschlossenen Suite-Tranche (Datum + Tabelle + offen).

## Lesereihenfolge für Agenten

1. **Diese Datei** — Checkpoint / Fortschritt / offen  
2. [`suite-enterprise-program.md`](suite-enterprise-program.md) — E1–E9 Detail  
3. [`suite-funktionsstand.md`](suite-funktionsstand.md) — Feature-Landkarte aller Apps  
4. [`suite-use-case-testing.md`](suite-use-case-testing.md) — UC-Matrix + E2E  
5. Spec SSOT: [`specs/domain/suite-enterprise-program.md`](../specs/domain/suite-enterprise-program.md) · [`collection-share-links.md`](../specs/domain/collection-share-links.md)

Handover-Einstieg: [`handover/README.md`](handover/README.md).

---

## Produktinvariante

Eine **Collection** = einziges nutzerseitiges Projekt. Produkte = Capabilities (CHECKION, AUDION, BRANDION, CREATION, SPIRION, METRON). VIDEON = Collection-Medien-Workspace (Cut). ECHON = Research-Companion. Federation: `2026-05-plexon-federation-v3`. Prod control plane bleibt `chbrdk/PLEXON`.

---

## Enterprise-Programm E1–E9

| Welle | Status | Kurz |
|---|---|---|
| E1 Lagebild | **Done** | Team, Aktivität, Capability-Panes (auch leer), Destillat-Ingest |
| E2 Kundenraum | **Done (API)** · UX **deferred** | Slot-APIs live; Collection-Home zeigt **Share-Links-Hub** statt Room-Panel |
| E3 Termin/Gegentest | **Done** | Schedule-Scheduler, Retest, CHECKION Delta |
| E4 Suite-Audit | **Done** | Ingest Session/Service; Produkt-Clients |
| E5 Launch-Gate / Fix | **Done** | Vorlagen; Soft-Skip + Catalog `skipped` |
| E6 Persona×Seite | **Done** | AUDION-Pane → Assistant-Draft |
| E7 Kampagnenbrief | **Done** | CRUD + Assistant-Intents |
| E8 Wettbewerb/Krise | **Done** | Krisenvorlage; Soft-Skip unbound |
| E9 Directory | **Stub Done** | Admin ready:false; IdP-Laufzeit bewusst später |

Migrationen: `0020` ClientRoom/Audit · `0021` Activity/Brief/Directory · `0022` `collection_share_links`.

---

## Share-Links Hub (E2 operative Fläche)

**Spec:** `collection-share-links.md`  
**UI:** Collection-Home Band Freigaben (nicht Kundenraum-Panel).

| Writer | kind | Stand |
|---|---|---|
| Creation | `client_page` | Live · Projection inkl. öffentlichem `href` (`/share/p/:token`) |
| EQC (Plexon) | `quick_check` | Live |
| Metron | `dashboard` | Live · Hub-Revoke fan-out Provisioning-DELETE |
| Checkion | `scan_overview` | Live · Hub-Revoke fan-out Provisioning-DELETE |
| Brandion | `brand_findings` | Live (Freigabe) |
| Videon | `cut` | Live (Approve) |
| Audion | — | **Deferred** (ephemere Chat-Links) |

Hub-Revoke: Creation wie bisher; Checkion/Metron best-effort Product-DELETE; Registry `revokedAt`.

---

## Härte-Backlog (geschlossen 2026-09-26)

| Item | Ergebnis |
|---|---|
| Flow-Skip `skipReason` | Catalog + Codes Checkion/Audion/Videon/Retest |
| Capability-Panes ohne Lauf | Entry-Teaser + Nav immer |
| AUDION Study Fixture-Label | `study-evidence-mode` + UI-Tests |
| Destillat Call-Site Inventory | `knowledge/distillate-call-sites.md` in 6 Product-Repos + Contract-Tests |

---

## Verifikation Staging

| Schicht | Ergebnis (2026-09-26) |
|---|---|
| Playwright `npm run test:e2e:staging` | **13/13 grün** (~27s) — UC1, UC9, E2 API, Share-Links Hub, E3, E5, E8, E9 |
| Vitest Suite-Contracts | skip / lagebild / distillate-inventory / share-links Hub |

Env-Keys (keine Werte in Git): `E2E_*` · `.env.e2e.local` · Staging-FQDNs in [`paths.md`](paths.md).

---

## Parallel weitergelaufen (nicht Enterprise-Objekt, aber Suite)

Seit dem Enterprise-Checkpoint zusätzlich u. a. (Repos-Main, Stichprobe):

| Thema | Wo |
|---|---|
| **Usage / Token-Metering** | Plexon Aggregation; Product-Reports (Checkion SEO/GEO, Audion Journey/LLM, Videon OpenRouter, Metron Suggestions, …) |
| **JEV** (Act/Shadow) | Plexon + Product Stubs/Soaks; Docs unter `knowledge`/jev |
| **CHECKION SEO** | Suggest Evidence, Field Analyze, Overview-Dashboard, GSC OAuth Phase |

Bei Usage/JEV/SEO immer Specs im jeweiligen Repo lesen — hier nur Orientierung.

---

## Bewusst offen / deferred

1. **Kundenraum-UX** auf Collection-Home wieder einblenden (API bleibt; jetzige UX = Share-Links-Hub).  
2. **Audion** in Share-Links Hub.  
3. **E9 IdP** (OIDC/SAML/SCIM) Laufzeit.  
4. **Handover/Tutorials** weiterproduzieren (`knowledge/handover/`, `knowledge/tutorials/`).  
5. Prod-Deploy nur über control plane `chbrdk/PLEXON` — dieses Island = Federation-Staging.
6. **Suite Cleanup** — Inventare + Freigabe: [`suite-cleanup.md`](suite-cleanup.md) · [`suite-cleanup-drop-safe.md`](suite-cleanup-drop-safe.md).  
   - Netz + 9× `cleanup-inventory.md` live.  
   - **Welle 2a** executed (plexon dead chrome, audion tmp/HTML dumps, checkion orphan ops notes).  
   - **Welle 2b** awaits „los“ (Echon `deprecated/` + `v2/`, MUI reshape, …).

---

## Empfohlene nächste Foki (Priorität)

1. Suite-Cleanup **Welle 2b** nach „los“ auf [`suite-cleanup-drop-safe.md`](suite-cleanup-drop-safe.md) **oder**  
2. Tutorial-/Handover-Welle **oder**  
3. Usage/JEV/SEO-Härte / MUI-Board-Reshape.

Kein paralleles Enterprise-Objekt nötigen — E1–E9 + Hub + Härte + E2E sind Checkpoint-fertig.

---

## Schnellreferenz Commits (Tranche Enterprise Share/Härte)

| Repo | Beispiele |
|---|---|
| plexon-v3 | Share-Links Hub, skipReasons, Usage-Aggregation (später) |
| checkion-v3 / metron-v3 | Share Hub writers + revoke fan-out |
| brandion / videon / creation | Freigabe → Hub; Creation `href` dual-write |
| audion-v3 | Fixture-Label + Destillat-Inventar |

Staging-Deploys der Enterprise-Tranche waren grün; spätere Usage/SEO-Commits separat verifizieren.
