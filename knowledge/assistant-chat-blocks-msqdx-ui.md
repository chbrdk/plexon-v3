# Assistant chat blocks ↔ `@msqdx/ui`

**Date:** 2026-08-11  
**Storybook:** `https://ds.projects-a.plygrnd.tech` · `Organisms/ChatCatalog`

## Barrel gate (React #130)

Plexon aliases `@msqdx/ui` → `lib/msqdx-ui.ts`. Imports that are **not** re-exported there are `undefined` at runtime → minified React error **#130** (`Element type is invalid … got: undefined`).

Same class of bug as missing `IconEdit` / `IconTrash`. When wiring a new DS chat primitive into `components/assistant-ui`, **always** add the export to `lib/msqdx-ui.ts`. Guard: `__tests__/assistant-chat-blocks-msqdx-ui.test.ts` (barrel must cover every `@msqdx/ui` import under `components/` + `app/`).

Chunk clue: stack frames in `4bd1b696-….js` are React itself on **plexon-v3** (that hash is not present on brandion/audion/checkion).

## Mapping

| Generative block | Plexon wrapper | DS primitive |
|------------------|----------------|--------------|
| `metric_grid` | `UiMetricGrid` | `ChatMetricGrid` |
| `key_value_list` | `UiKeyValueList` | `ChatKeyValueList` |
| `step_list` | `UiStepList` | `ChatStepList` |
| `finding_list` | `UiFindingList` | `ChatBlockPanel` + optional `SwatchStrip` (`hex` / `swatches`) |
| `recommendation_list` | `UiRecommendationList` | `ChatBlockList` |
| `link_list` | `UiLinkList` | `ChatLinkList` |
| `alert` | `UiAlertBlock` | `ChatAlertBlock` |
| `data_table` | `UiDataTable` | `ChatDataTable` |
| `collapsible` | `UiCollapsibleBlock` | `ChatCollapsible` |
| `persona_card` / `target_group_card` | Entity wrappers | `ChatEntityGrid` |
| `phase_strip` | `UiPhaseStrip` | `ChatPhaseStrip` |
| `moment_list` | `UiMomentList` | `ChatMomentList` |
| `quote_list` | `UiQuoteList` | `ChatQuoteList` |

Builders: `build-journey-outline-ui.ts` (`buildJourneyOutlineBlocks` · `buildJourneyDetailLayout`)

**Intent:** `journey_outline` / `journey_generate` — specs + `knowledge/assistant-journey-outline.md` · `knowledge/assistant-journey-interactive.md` · handlers `journey-outline.ts` / `journey-generate.ts`  
Interactive: embedded `phase_strip.moments` + `UiPhaseStrip` phase click.
