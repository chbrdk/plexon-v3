# UI migrate — Event Quick Check

**Status:** Accepted — Wave 6 done — 2026-07-31  
**Route:** `/event-quick-check*`  
**Implements:** `app/event-quick-check/**` · `components/event-quick-check/**`  
**Layout:** full-height workstation inside AppShell

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Workflow phases (idle → review → geo → deep scan → dashboard) | **keep** | All API routes + stream client unchanged |
| URL / project / depth form | **reshape** | `Field` + `Input` + `ToggleGroup` |
| Review panels (brief, competitors, geo) | **reshape** | DS forms; logic unchanged |
| Deep scan poll + progress | **reshape** | CSS progress bar + `Spinner`; not MUI LinearProgress |
| Dashboard grid + report sections | **keep** (capability) | Toolbar on DS `Button`; panels still use `UiBlockSurface` until Wave 7 |
| Recharts charts | **keep** | Only MUI chrome around charts removed |
| History | **reshape** | `@msqdx/ui` `Dialog` + list rows |
| LLM answer dialog | **reshape** | `@msqdx/ui` `Dialog` + `Text` |
| PlexonPageChrome / AppHeaderV2 | **drop** | AppShell title is enough |
| MUI Box/Stack/Typography/TextField | **drop** | `div` + `plexon-eqc-*` CSS + `Text` |

## Target composition

| Band | Treatment |
|------|-----------|
| Page shell | `plexon-eqc-stage` + Suspense `EmptyState` / `Spinner` |
| Workflow steps | `UiStepList` (existing) during running phase |
| Panels | `Panel`-style forms + `UiBlockSurface` on dashboard |
| Forms | `Field` / `Input` / `Textarea` / `ToggleGroup` |
| Progress | `Spinner` + `.plexon-eqc-progress` |
| Charts | Recharts inside `UiBlockSurface` + `.plexon-eqc-chart` |

## File set (Wave 6)

- `app/event-quick-check/page.tsx`
- `components/event-quick-check/EventQuickCheckPageClient.tsx`
- `components/event-quick-check/EventQuickCheckCompanyBriefPanel.tsx`
- `components/event-quick-check/EventQuickCheckCompetitorsPanel.tsx`
- `components/event-quick-check/EventQuickCheckGeoQuestionsPanel.tsx`
- `components/event-quick-check/EventQuickCheckDeepScanPanel.tsx`
- `components/event-quick-check/EventQuickCheckDeepScanBanner.tsx`
- `components/event-quick-check/EventQuickCheckReviewGate.tsx`
- `components/event-quick-check/EventQuickCheckDashboardView.tsx`
- `components/event-quick-check/EventQuickCheckDashboardPanel.tsx`
- `components/event-quick-check/EventQuickCheckHistoryDialog.tsx`
- `components/event-quick-check/EventQuickCheckHistoryPanel.tsx`
- `components/event-quick-check/EventQuickCheckLlmAnswerDialog.tsx`
- `components/event-quick-check/EventQuickCheckCitationSection.tsx`
- `components/event-quick-check/EventQuickCheckCitationCompetitorChart.tsx`
- `components/event-quick-check/EventQuickCheckGeoBarChart.tsx`
- `components/event-quick-check/EventQuickCheckGeoCharts.tsx`
- `styles/globals.css` (`.plexon-eqc-*`)

## Acceptance

1. No `@mui/material` or `@msqdx/react` in EQC file set above. ✅
2. Existing workflow APIs and report deep-links unchanged. ✅
3. Progress table Wave 6 → done. ✅

## Progressive (not Wave 6 blockers)

- `EventQuickCheckReportSections.tsx` (assistant reports) still on bridge
- `ReportPdfDownloadButton` / `ReportBinaryDownloadButton` still bridge
- `UiBlockSurface` / `UiStepList` organisms still bridge-backed
