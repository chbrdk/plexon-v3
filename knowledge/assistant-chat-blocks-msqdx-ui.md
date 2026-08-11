# Assistant chat blocks ↔ `@msqdx/ui`

**Date:** 2026-08-11  
**Storybook:** `https://ds.projects-a.plygrnd.tech` · `Organisms/ChatCatalog`

## Mapping

| Generative block | Plexon wrapper | DS primitive |
|------------------|----------------|--------------|
| `metric_grid` | `UiMetricGrid` | `ChatBlockPanel` + `ChatMetricGrid` |
| `key_value_list` | `UiKeyValueList` | `ChatBlockPanel` + `ChatKeyValueList` |
| `step_list` | `UiStepList` | `ChatBlockPanel` + `ChatStepList` |
| `finding_list` | `UiFindingList` | `ChatBlockPanel` + `ChatBlockList` |
| `recommendation_list` | `UiRecommendationList` | `ChatBlockPanel` + `ChatBlockList` (+ chips) |
| `link_list` | `UiLinkList` | `ChatBlockPanel` + `ChatLinkList` |
| `alert` | `UiAlertBlock` | `ChatAlertBlock` |
| `data_table` | `UiDataTable` | `ChatBlockPanel` + `ChatDataTable` |
| `collapsible` | `UiCollapsibleBlock` | `ChatCollapsible` (+ product markdown slot) |
| `persona_card` | `UiPersonaCardBlock` | `ChatBlockPanel` + `ChatEntityGrid` |
| `target_group_card` | `UiTargetGroupCardBlock` | `ChatBlockPanel` + `ChatEntityGrid` |

Still product-owned: `summary_card`, `corner_tab_section`, `chart`, EQC report/gate.

## Dep

Local: `file:../msqdx-ui/packages/ui`. Coolify clones `msqdx-ui@main` during plexon image build.
