# Vaillant Group · MaFo Demo (UC1)

**Collection only:** `Vaillant Group` — **not** a separate consumer „Vaillant“-Projekt.

| Key | Value |
|-----|--------|
| Collection ID | `f3d27e9f-d14c-4880-82be-3ca31c051173` |
| AUDION mirror | `proj-vaillant-group-mtb6qr6b` |
| BRANDION mirror | `proj-mtb6qr7q` · Guideline `gl-mtinudb1` |
| CREATION mirror | `proj-mtb6qr9e` |
| Corporate URL | `https://www.vaillant-group.com/` |
| B2C research URL (UC1) | `https://www.vaillant.de/heizung/waermepumpe/` |

Code SSOT: `lib/demo/vaillant-group-mafo.ts`

## Flow anlegen (Plexon)

1. Collection öffnen: `/projects/f3d27e9f-d14c-4880-82be-3ca31c051173/flows`
2. Template **Vaillant Group · Barrier Research (UC1)** wählen
3. URL vorausgefüllt: B2C-Wärmepumpen-Seite (Research-Touchpoint, nicht Corporate-Site)
4. Flow starten → AUDION (Barrieren) → CHECKION (Scan) → BRANDION (Measure)

Programmatisch: `ensureVaillantGroupBarrierResearchFlow()` in `lib/demo/bootstrap-vaillant-group-mafo.ts`

## Knowledge Pack (ECHON-Facet)

Hypothesen-Seed: `lib/demo/vaillant-group-knowledge-seed.ts` → Facet `research_brief` manuell oder via Assistant publizieren.

## AUDION Personas

Seed-Definitionen: `audion-v3/apps/web/lib/fixtures/vaillant-group-mafo-seed.ts`  
Operator: Personas per API in Projekt `proj-vaillant-group-mtb6qr6b` anlegen (6 Segmente UC1).

## CREATION

Editor: `https://creation-v3.projects-a.plygrnd.tech/editor?platformProjectId=f3d27e9f-d14c-4880-82be-3ca31c051173`

Scene `scene-vaillant-landing`: Landing + 3 Insight-Seiten (Kosten, Eignung, 3 Schritte) + Kontakt.
