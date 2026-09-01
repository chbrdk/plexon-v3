# Vaillant Group · MaFo Demo (UC1 + UC2)

**Collection only:** `Vaillant Group` — **not** a separate consumer „Vaillant“-Projekt.

| Key | Value |
|-----|--------|
| Collection ID | `f3d27e9f-d14c-4880-82be-3ca31c051173` |
| AUDION mirror | `proj-vaillant-group-mtb6qr6b` |
| BRANDION mirror | `proj-mtb6qr7q` · Guideline `gl-mtinudb1` |
| CREATION mirror | `proj-mtb6qr9e` |
| Corporate URL | `https://www.vaillant-group.com/` |
| B2C research URL (UC1) | `https://www.vaillant.de/heizung/waermepumpe/` |
| B2B Fachpartner URL (UC2) | `https://www.vaillant.de/fachpartner/` |

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
