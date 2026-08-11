# Assistant chat blocks ↔ `@msqdx/ui`

**Date:** 2026-08-11  
**Storybook:** `https://ds.projects-a.plygrnd.tech` · `Organisms/ChatCatalog`

## Mapping

| Generative block | Plexon wrapper | DS primitive |
|------------------|----------------|--------------|
| `metric_grid` | `UiMetricGrid` | `ChatMetricGrid` |
| `key_value_list` | `UiKeyValueList` | `ChatKeyValueList` |
| `step_list` | `UiStepList` | `ChatStepList` |
| `finding_list` | `UiFindingList` | `ChatBlockList` |
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

**Intent:** `journey_outline` — `specs/domain/assistant-journey-outline.md` · `knowledge/assistant-journey-outline.md` · handler `handlers/journey-outline.ts`
