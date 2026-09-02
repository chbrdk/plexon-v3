# Vaillant Group · MaFo Demo (UC1 + UC2)

**Collection only:** `Vaillant Group` — **not** a separate consumer „Vaillant“-Projekt.

| Key | Value |
|-----|--------|
| Collection ID | `f3d27e9f-d14c-4880-82be-3ca31c051173` |
| AUDION mirror | `proj-vaillant-group-mtb6qr6b` |
| BRANDION mirror | `proj-mtb6qr7q` · Guideline `gl-mtinudb1` |
| CREATION mirror | `proj-mtb6qr9e` |
| Corporate URL | `https://www.vaillant-group.com/` |
| B2C research URL (UC1) | `https://www.vaillant.de/produkte/waermepumpen/` |
| B2B Fachpartner URL (UC2) | `https://www.myvaillantpro.de/` (Redirect von `/fachpartner/`) |

Code SSOT: `lib/demo/vaillant-group-mafo.ts` · Briefing: `PLEXON___Vaillant_Group.md`

## UC1 — Kaufbarrieren (Eigenheimbesitzer)

Flow-Template: **`vaillant-barrier-research-v1`** (Showcase-Lite)  
`Zielgruppe → Persona → Touchpoint → eine Frage → Scan → Marke`

## UC2 — Fachhandwerker Dual Perspective

Flow-Template: **`vaillant-installer-dual-v1`** (Showcase-Lite)  
Endkunde-Frage → Installateur-Frage → Scan → Marke (keine Score/Issue-Gates)

Spec: `specs/domain/vaillant-mafo-showcase-lite.md`

## Bootstrap (Staging)

Idempotent on container start (after `db:push`):

- Knowledge Pack `research_brief` (UC1 Hypothesen + UC2 Opportunity Map)
- Flow UC1 + Flow UC2
- CHECKION B2C/B2B Deep-Scan-Corpus (Wave 2 Epic D) — **reuse** vorhandener completed Scans; Neuscan nur bei `--force-corpus-refresh`
- AUDION personas/TGs (audion-v3 entrypoint) · BRANDION CD guideline `gl-mtinudb1` (brandion-v3 entrypoint)

Operator: `DATABASE_URL=… npx tsx scripts/bootstrap-vaillant-group-mafo.ts`  
Ohne Poll-Wartezeit (Container): `… bootstrap-vaillant-group-mafo.ts --corpus-no-wait`  
Corpus erzwingen neu crawlen: `… --force-corpus-refresh` oder `VAILLANT_MAFO_CORPUS_FORCE_REFRESH=1`

## Knowledge Pack

Seed: `lib/demo/vaillant-group-knowledge-seed.ts` → Facet `research_brief`  
Bootstrap: `ensureVaillantGroupKnowledgePackSeed()` in `lib/demo/bootstrap-vaillant-group-knowledge-pack.ts`

**Wave 1 — Collection Memory:** Abgeschlossene UC1/UC2-Flow-Runs mergen Distillate in `research_brief`-Sections `vaillant-uc1-flow-latest` / `vaillant-uc2-flow-latest`. Assistant-Reports auf dieser Collection mergen `assistant-report-latest`. Spec: `specs/domain/collection-memory-wave1.md`.

**Wave 2 — ECHON:** Optional Collection-Binding + Facet `market_intelligence` (Publish aus ECHON research_ask / EQC Markt-Schritt). Spec: `specs/domain/echon-collection-binding.md`.

## AUDION Personas & Zielgruppen

Fixtures: `audion-v3/apps/web/lib/fixtures/vaillant-group-mafo-seed.ts`  
Store-Seed (Container): `seedVaillantGroupMafoStore()` — 9 Personas + 8 Zielgruppen (`proj-vaillant-group-mtb6qr6b`)

- UC1: 6 Segmente (je 1 Zielgruppe ↔ 1 Persona)
- UC2: `tg-vg-homeowner-decision` (6 UC1-Personas) + `tg-vg-fachhandwerker` (3 Installateur-Personas)

Details: `audion-v3/knowledge/vaillant-group-mafo-seed.md`

## BRANDION Corporate Design

Fixtures: `brandion-v3/apps/web/lib/fixtures/vaillant-group-mafo-seed.ts`  
Store-Seed (Container): `seedVaillantGroupMafoStore()` — Project `proj-mtb6qr7q` + active Guideline `gl-mtinudb1`  
Details: `brandion-v3/knowledge/vaillant-group-mafo-seed.md`

Studio: `https://brandion-v3.projects-a.plygrnd.tech/guidelines/gl-mtinudb1`  
Active pack: `…/api/guidelines/active-pack?platformProjectId=f3d27e9f-d14c-4880-82be-3ca31c051173`

### Flow-Board · voreingestellte AUDION-IDs

Bootstrap re-applies Templates on container start (`ensureVaillantGroupBarrierResearchFlow` / `ensureVaillantGroupInstallerDualFlow`).

| Flow | Zielgruppe-Node | `targetGroupId` | Persona-Node | `personaId` |
|------|-----------------|-----------------|--------------|-------------|
| UC1 | `n-zielgruppe` | `tg-vg-altbau-familie` | `n-persona` | `persona-vg-sandra-altbau` |
| UC2 | `n-zg-endkunde` | `tg-vg-homeowner-decision` | `n-persona-ek` | `persona-vg-sandra-altbau` |
| UC2 | `n-zg-installer` | `tg-vg-fachhandwerker` | `n-persona-inst` | `persona-vg-meister-klaus` |

SSOT: `lib/demo/vaillant-group-mafo.ts` · Templates: `createVaillantBarrierResearchTemplate` / `createVaillantInstallerDualPerspectiveTemplate`

## CREATION

Editor: `https://creation-v3.projects-a.plygrnd.tech/editor?platformProjectId=f3d27e9f-d14c-4880-82be-3ca31c051173`

Scene `scene-vaillant-landing`: Landing + 3 Insight-Seiten (Kosten, Eignung, 3 Schritte) + Kontakt.

## Demo-Walkthrough (Staging)

**Collection:** [Vaillant Group · Plexon](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173)

### 0 · Kontext (Knowledge Pack)

1. [Knowledge Pack öffnen](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/knowledge)
2. Facet **`research_brief`** — UC1-Hypothesen + UC2 Opportunity Map (Revision ≥ 3)

### UC1 · Kaufbarrieren (Eigenheimbesitzer)

| Schritt | Wo | Was |
|--------|-----|-----|
| 1 | [Flow UC1](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/flows/14ce6052-ff76-42a0-8725-f2a13daf121e) | Board: **Wer?** Sandra · **Frage?** Barriere · **Prüfen?** Scan + Marke |
| 2 | Optional | [AUDION Personas](https://audion-v3.projects-a.plygrnd.tech/projects/proj-vaillant-group-mtb6qr6b) / CREATION Scene |

**Fragestellung:** *Warum entscheidet sich ein Eigenheimbesitzer gegen eine Wärmepumpe?*

Demo-Tipp: abgeschlossenen Run zeigen; Gates gibt es bewusst nicht — Prozess vor Korrektheit.

### UC2 · Fachhandwerker Dual Perspective

| Schritt | Wo | Was |
|--------|-----|-----|
| 1 | [Flow UC2](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/flows/66a3a3d0-f2e3-4312-b1f9-25c892dc8e4a) | Board: Endkunde-Frage → Installateur-Frage → Opportunity → Scan + Marke |

**Fragestellung:** *Was braucht der Fachhandwerker, damit er Vaillant empfiehlt?*

Optional Assistant: *Welche Seiten sind für **Klaus** relevant?* (B2B-Corpus) — Spec `assistant-persona-page-relevance.md`.

### Flow-IDs (Staging)

| Flow | UUID |
|------|------|
| UC1 Barrier Research | `14ce6052-ff76-42a0-8725-f2a13daf121e` |
| UC2 Installer Dual | `66a3a3d0-f2e3-4312-b1f9-25c892dc8e4a` |

Direktlinks Board:

- UC1: `…/flows/14ce6052-ff76-42a0-8725-f2a13daf121e`
- UC2: `…/flows/66a3a3d0-f2e3-4312-b1f9-25c892dc8e4a`

### Operator

```bash
# Flow manuell (Container oder lokal mit Staging DATABASE_URL)
DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc2
DATABASE_URL=… npx tsx scripts/run-vaillant-group-mafo-flow.ts --uc1 --if-pending
```

## Wave 2 (Epic D — shipped)

Bootstrap stellt B2C/B2B Deep Scans automatisch sicher; Flow-Runner wartet auf CHECKION-Corpus vor UC-Runs.  
Spec: `specs/domain/vaillant-mafo-wave2-demo.md` · Roadmap: `knowledge/persona-page-relevance-wave2-roadmap.md`.

Bootstrap-Logs:

```
[vaillant-mafo] CHECKION B2C corpus: domain-{id} completed pages=42
[vaillant-mafo] CHECKION B2B corpus: …
```
