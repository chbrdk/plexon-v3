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

Flow-Template: **`vaillant-barrier-research-v1`**  
AUDION → CHECKION (B2C Scan) → BRANDION

## UC2 — Fachhandwerker Dual Perspective

Flow-Template: **`vaillant-installer-dual-v1`**  
Endkunde-Journey (B2C) → Installateur-Journey (Fachpartner) → CHECKION → BRANDION

## Bootstrap (Staging)

Idempotent on container start (after `db:push`):

- Knowledge Pack `research_brief` (UC1 Hypothesen + UC2 Opportunity Map)
- Flow UC1 + Flow UC2

Operator: `DATABASE_URL=… npx tsx scripts/bootstrap-vaillant-group-mafo.ts`

## Knowledge Pack

Seed: `lib/demo/vaillant-group-knowledge-seed.ts` → Facet `research_brief`  
Bootstrap: `ensureVaillantGroupKnowledgePackSeed()` in `lib/demo/bootstrap-vaillant-group-knowledge-pack.ts`

## AUDION Personas

UC1 (6 Segmente): `audion-v3/apps/web/lib/fixtures/vaillant-group-mafo-seed.ts`  
UC2 (3 Fachhandwerker): `VAILLANT_GROUP_UC2_INSTALLER_PERSONAS` — auto-seed on audion container boot

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
| 1 | [Flow-Galerie](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/flows) → **Barrier Research (UC1)** | Flow `14ce6052-ff76-42a0-8725-f2a13daf121e` öffnen |
| 2 | Board · **Testen** | Journey auf `vaillant.de/produkte/waermepumpen/` — Persona aus UC1-Set (6 Segmente) |
| 3 | AUDION | [Personas](https://audion-v3.projects-a.plygrnd.tech/projects/proj-vaillant-group-mtb6qr6b) — z. B. Sandra (Altbau), Thomas (Tausch) |
| 4 | CHECKION | Scan der B2C-URL — Qualitäts-Spine im Flow |
| 5 | BRANDION | Guideline `gl-mtinudb1` · Brand Measure |
| 6 | CREATION | [Editor](https://creation-v3.projects-a.plygrnd.tech/editor?platformProjectId=f3d27e9f-d14c-4880-82be-3ca31c051173) — Scene `scene-vaillant-landing` + Insight-Varianten |

**Fragestellung:** *Warum entscheidet sich ein Eigenheimbesitzer gegen eine Wärmepumpe?*

**Assistant (Wave 1 — Persona→Seiten):** Im Collection-Chat fragen:

> *Welche Seiten auf vaillant.de sind für **Sandra** (Altbau-Eigenheimbesitzerin) besonders relevant — mit den wichtigsten CHECKION-Metriken?*

Erwartung: Ranked-Liste aus CHECKION Deep Scan (Score, A11y, SEO, Issues) + kurze Relevanz-Begründung aus AUDION-Persona. Spec: `specs/domain/assistant-persona-page-relevance.md`.

### UC2 · Fachhandwerker Dual Perspective

| Schritt | Wo | Was |
|--------|-----|-----|
| 1 | [Flow-Galerie](https://plexon-v3.projects-a.plygrnd.tech/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/flows) → **Installer Dual Perspective (UC2)** | Flow `66a3a3d0-f2e3-4312-b1f9-25c892dc8e4a` |
| 2 | Board · **Testen** | **Endkunde:** B2C Touchpoint → Prompt → **Installateur:** myVaillant Pro → Opportunity |
| 3 | AUDION | UC2-Personas: Klaus (Meister), Sandra (Planung), Tim (Monteur) |
| 4 | CHECKION + BRANDION | wie UC1 — Scan + Brand Measure auf B2C-Spine |

**Fragestellung:** *Was braucht der Fachhandwerker, damit er Vaillant empfiehlt?*

UC1 + UC2 starten beim **Container-Boot** sequentiell im Hintergrund, solange noch kein completed Run existiert (`scripts/run-vaillant-group-mafo-flow.ts --all --if-pending`).

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
