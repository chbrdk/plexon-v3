# Run a WCAG quick scan

A **WCAG quick scan** checks a **single URL** for accessibility basics inside a Collection-bound CHECKION workspace. It is the fastest useful start before a deep crawl.

## Steps

1. Open CHECKION from your Collection.
2. Choose **New scan** → **WCAG** → **Quick single scan**.
3. Enter the exact page URL (full `https://` path) you are authorized to test.
4. Confirm the Collection (“Project” in the UI is the local capability record for that Collection).
5. **Launch single scan** — the job is queued; start is **not** the finished report.
6. Open **Jobs**. When status is **Completed**, open the result.
7. Orient in **Overview** (weakest signals first) → **Issues** (what / where / fix) → **Detail** (technical meters).

## How to read the result

- Overall score is orientation, not a substitute for findings.
- Scoreline is **weakest first**.
- Repeated rule hits may be grouped; treat groups as patterns when you later run a deep scan.

## Rules

- Only crawl domains with permission.
- Do not treat a launch confirmation as the score.

## Related

- [Getting started](checkion.getting-started)
- [Domain deep scan](checkion.scan.domain-deep)
- [GEO layers](checkion.scan.geo-layers)
