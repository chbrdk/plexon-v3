# GEO layers: Model memory vs Live search

CHECKION GEO uses **two separate layers**. Do not merge their hit rates or scores.

| Layer | Meaning |
|-------|---------|
| **Model memory** | What a model already “knows” about a brand without browsing (ungrounded) |
| **Live search** | What appears when the model can search live |

## Run Model memory (typical first GEO job)

1. Scan → **GEO** → enable **Model memory** only (keep Live search off for a clean Layer-1 read).
2. Enter **URL** and/or **company name** (at least one required).
3. Bind the existing Collection — avoid accidental new capability records.
4. Curate **Queries**: real user questions (alternatives, comparisons), not only the brand name. Use Suggest carefully.
5. Keep only models available in this environment.
6. **Start GEO job** → wait for **Completed** in **Jobs**.
7. Read Overview (presence, placement, share of voice) then query × model details.

## Practice

- Run and read each layer on its own; Share of Voice is relative to the question set.
- Compare within a layer over time; never average across layers.
- Live search is a **separate** job when you need web-grounded visibility.

## Related

- [Getting started](checkion.getting-started)
- [WCAG quick scan](checkion.scan.wcag-quick)
- [SEO crawl](checkion.scan.seo-crawl)
