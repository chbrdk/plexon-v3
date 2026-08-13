# DS tokens as a Plexon Collection project

**Canonical plan:** `brandion-v3/knowledge/ds-tokens-as-plexon-project.md` (program **DS-DEPOSIT**, 2026-08-13)  
**Status:** D0–D4 shipped · **D6 drift CI landed** (2026-08-13) · D5 optional

## Plexon role (only)

- Host a normal **Collection** (e.g. “MSQ DX”) under the MSQ company — not a new project type.
- Ensure Brandion + CREATION (+ checkion/audion) capability mirrors per `specs/domain/collection-projects.md` Phase 1A.
- Deep-link: Brandion guidelines / CREATION editor with `platformProjectId`.
- **Do not** store token JSON or invent a platform token service.

## Staging Collection (D2 → D4)

| Field | Value |
|-------|-------|
| Company | MSQDX |
| Collection | MSQ DX |
| `platformProjectId` | `32498667-471e-4b21-b920-5eff5c338300` |
| Guideline | `gl-msrxlt4u` (active, **116** leaves after D3) |
| Theme | **D3a** — dark active; light = second guideline (not dual channels) |
| D2 operator | `brandion-v3/knowledge/ds-deposit-d2-operator.md` |
| D3 operator | `brandion-v3/knowledge/ds-deposit-d3-operator.md` |
| D4 operator | `creation-v3/knowledge/ds-deposit-d4-operator.md` |
| D6 drift CI | `brandion-v3/knowledge/ds-deposit-d6-operator.md` · `npm run ds:deposit:check` |

Federation contract remains `2026-05-plexon-federation-v3`.

## Related

- Brandion SSOT + `active-pack`: `brandion-v3/specs/domain/creation-token-export.md`
- Deposit pack file: `brandion-v3/packs/msq-dx-deposit.dtcg.json` · light twin `…/msq-dx-deposit-light.dtcg.json`
- CREATION consume: `creation-v3/knowledge/token-layers.md` · CT-14 gap map
- Collection model: `specs/domain/collection-projects.md`
- Paths: `knowledge/paths.md` (this repo)
