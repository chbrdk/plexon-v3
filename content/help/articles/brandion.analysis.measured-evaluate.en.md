# Measured evaluate a PDF

**Measured evaluate** (Navigation: **Analysis**, path `/analysis`) compares a PDF or image to the selected Guideline. It replaces the old Detection Lab hub (redirect only — do not treat Lab as a product name).

Primary path: upload **document evidence**. Lab evidence (CSS / DTCG paste) is secondary — keep it closed for this workflow.

## Steps

1. Open BRANDION → **Analysis** (Measured evaluate).
2. Select the target **Guideline** (prefer the Collection’s Active guideline).
3. Under **Primary evidence** / Document, **Choose file…** and pick a controlled demo PDF.
4. Confirm auto-detect shows **Detected: PDF** (images are also supported).
5. Leave page-URL empty when PDF is primary.
6. **Run evaluate** — wait through **Running…**; that is not the final verdict.
7. Read **StatLede**: Passed / Failed / Skipped, then open **Findings**.
8. Optionally check **Recent runs** in history.

## How to read results

- Each finding maps to a Guideline rule — not a ranking promise.
- Failed > 0 does **not** mean “brand is compliant”; interpret honestly.
- Unmapped-token banners point back to the Guideline studio — fix tokens/rules, then re-run.

## Rules

- No customer PDFs without permission; use staging fixtures or approved demos.
- If there are no guidelines yet, activate or create one first.

## Related

- [Getting started](brandion.getting-started)
- [Activate a Guideline](brandion.guidelines.activate)
