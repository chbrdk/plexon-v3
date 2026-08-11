# Assistant chat blocks ↔ `@msqdx/ui`

**Date:** 2026-08-11  
**Storybook:** `https://ds.projects-a.plygrnd.tech` · `Organisms/ChatCatalog` · Molecules `ChatMetricGrid` / `ChatKeyValueList` / `ChatStepList`

## Mapping

| Generative block | Plexon wrapper | DS primitive |
|------------------|----------------|--------------|
| `metric_grid` | `UiMetricGrid` | `ChatBlockPanel` + `ChatMetricGrid` |
| `key_value_list` | `UiKeyValueList` | `ChatBlockPanel` + `ChatKeyValueList` |
| `step_list` | `UiStepList` | `ChatBlockPanel` + `ChatStepList` |
| `finding_list` / `recommendation_list` | still product lists (promote next) | `ChatBlockPanel` + `ChatBlockList` available |

Wrappers keep the Zod-validated props API for `AssistantBlockRenderer`; chrome lives in the DS.

## Dep

Local: `file:../msqdx-ui/packages/ui` (see `knowledge/paths.md`). Coolify builds clone/pin separately — ship DS first, then redeploy plexon if the image does not use the sibling path.
