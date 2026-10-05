# Run a WCAG domain deep scan

A **deep scan** starts at a URL and follows reachable pages under the host. Use it when a quick scan found issues and you need to know whether they repeat across templates.

## Steps

1. Open CHECKION from your Collection → **New scan** / Scan.
2. Choose **WCAG** → **Deep scan**.
3. Enter an authorized entry URL (host root usually yields a wider corpus than a deep path).
4. Confirm the Collection binding.
5. **Launch deep scan** — the job is async and may run much longer than a single-page scan.
6. Track progress in **Jobs** (pages scanned, current URL). Pause / Resume / Cancel may be available; cancel does **not** produce a full domain result.
7. When **Completed**, open the domain magazine: Overview first, then systemic issues and affected pages.

## How to read the result

- Prioritize **systemic** issue groups (many pages) over one-off findings.
- Scoreline is **weakest first** — start with the weakest dimension.
- Missing chapters or empty data are **not** a pass.
- An incomplete crawl must not be sold as a full domain grade.

## Rules

- Only crawl domains you are authorized to test.
- Keep Collection context shared with later SEO and GEO runs.

## Related

- [Getting started](checkion.getting-started)
- [WCAG quick scan](checkion.scan.wcag-quick)
- [SEO crawl](checkion.scan.seo-crawl)
