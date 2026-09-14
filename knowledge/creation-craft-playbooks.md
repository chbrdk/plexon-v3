# Creation craft playbooks (multi-format)

**Spec:** `specs/domain/assistant-creation-agi-lite.md` § Wave B  
**Code:** `lib/assistant/creation-craft-playbooks.ts` · depth `lib/assistant/creation-scene-depth.ts` · gate `lib/assistant/creation-scene-quality.ts`

## Why

Agents defaulted to **web landing** craft. Real Collection work also needs **newsletter/email** and **print magazine / Mag-PDF report** — different palette, width, tokens, and quality jobs.

## Catalog

| Id | Quality job | Trigger examples |
|----|-------------|------------------|
| `creation_landing_v1` | `landing` | Landing, Startseite, Hero, PDP |
| `creation_newsletter_v1` | `newsletter` | Newsletter, E-Mail, mailer, digest |
| `creation_print_magazine_v1` | `print` | PrintPage, Magazin, Broschüre, DIN A4 |
| `creation_print_report_v1` | `print` | EQC Mag, Magazin-PDF, dataSlot, Whitepaper |
| `creation_page_as_pattern_v1` | `generic` | Seite als Pattern speichern |

## Format cheat sheet

| | Web landing | Newsletter | Print |
|--|-------------|------------|-------|
| Nodes | Site* / HTML | Site* / HTML **only** | **Print*** under `PrintPage` |
| Width | Fluid viewport | ~560–640px column | Paper / folio |
| Tokens | Free Hex greenfield | Free Hex / digital | Brandion **print** channel |
| Must | Hero mass = Display ≥48 **AND** full-bleed media (`backgroundImage` or large SiteImage) + CTA · text-only heroes fail gate | CTA; no Print* | ≥1 PrintPage |
| PDF | — | — | Mag-PDF via Creation editor (`composition-magazine-pdf`) |
| P92 report atoms | — | — | Chip `tone` · `PrintCallout` · Table `columnAlign` · `PrintSteps` (no SiteStack/SVG diagrams for Mag) |

## Related

- Creation print palette: `creation-v3/knowledge/editor-palette-print.md`
- Mag-PDF / MagazineTemplate: `specs/domain/creation-magazine-template-consume.md` · `creation-v3/knowledge/editor-palette-print.md`
- Print report atoms (agent): `knowledge/print-report-primitives-agent.md`
- Quality loop baseline: `knowledge/creation-mcp-assistant.md`
- Craft memory (Wave C): `lib/assistant/knowledge-pack/distill-creation-craft.ts` · sections `creation-craft-prefs-latest` + format recipes
- **Landing default hero** (BG fill overlay, no absolute import): `creation-v3/knowledge/gallery-hero-slider-prompt.md` · playbook `creation_landing_v1` § Default Hero
- **Landing quality gate** (display **and** media required): `knowledge/creation-landing-hero-gate.md`
- **Display Fallgefühl** (tight leading): `creation-v3/knowledge/landing-display-fallgefuehl.md`
- **Wireframe/Skizze = layout contract** (overrides overlay default): `knowledge/creation-wireframe-layout-contract.md` · ref `knowledge/refs/landing-wireframe-company-profile.jpg`
