# Confluence — AI Product pages (PLEXON suite)

Paste-ready pages matching the Brandion AI-product template (Summary → Overview → Resources → Team → Milestones → Status Update).

**Language:** English (same as existing Brandion Confluence page / Program Management template).  
**Last prepared:** 30 Aug 2026  
**Project Lead (default):** Christoph Bordeck  
**Sponsor (default):** Uwe Todoroff  

**Do not invent:** Teambox numbers, EU-SED asset codes, or unapproved budgets — marked `TBD (Program Manager)`.  
**Suite rule:** End users work in one **Collection**. CHECKION, AUDION, BRANDION, CREATION, SPIRION are capabilities inside that Collection — not separate project systems. ECHON is a research companion. VIDEON is roadmap until suite-integrated.

**Parent suggestion:** one Confluence parent “PLEXON Suite / AI Products” with children below.

---

# PLEXON

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

Project Lead is to provide answers to the questions below, using only sentence per question. Write it so a non-technical stakeholder understands it immediately.

**What is the product?**  
PLEXON is the shared web workspace of the MSQ DX suite where teams run a single Collection project that holds common knowledge, access, capability hand-offs, an AI assistant, and reusable Flows across brand, web quality, audience, and creation work.

**What measurable outcome does it deliver?**  
One shared project context instead of fragmented tool silos, so teams keep knowledge, scan results, personas, brand packs, and hand-offs together and can re-run multi-step Flows without rebuilding the process each time.

**Who is the target user group?**  
Primary: project leads, account owners, and cross-disciplinary client teams who need one place to orchestrate MSQ DX digital products. Secondary: MSQ DX delivery and enablement teams who onboard clients into the suite and run repeatable quality or research playbooks.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without PLEXON, each specialty tool keeps its own project, login story, and knowledge pile, so insights never travel cleanly from research to brand to web to design. MSQ DX then sells disconnected tools instead of a coherent platform, and client work stays slow, duplicated, and hard to govern.

**What makes this product compelling to a client or user?**  
Clients get one Collection as the project of record, with products opening in the right context and an assistant that can trigger shared capabilities and save successful recipes as Flows. For MSQ DX it is the control plane that productizes CX, brand, and digital quality as one operating system rather than a bag of apps.

**What do we already/need to have in place to be able to build this?**  
We need central auth and federation across companion apps, a Collection and knowledge-pack model, capability bindings to CHECKION, AUDION, BRANDION, CREATION and SPIRION, staging and production ops discipline, and shared UI from the MSQ DX design system.

**What does done look like, and how will this product reach its users?**  
Done means a client can create a Collection, see synchronized capability workspaces, use the assistant and Flows, and open each product with the same project context. Go-to-market: suite onboarding inside existing MSQ DX engagements, then subscription access to the platform hub with capability add-ons.

## Overview

This section is updated by the Program Manager

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | OPERATION |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — staging `https://plexon-v3.projects-a.plygrnd.tech` (prod control plane remains legacy PLEXON repo) |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

Project Lead must fill in the table below, including preferred team members. Approval of each team member participation will be provided by Program Management in consultation with GF. Project Lead will be notified.

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

For more information visit https://confluence.udg.de/x/TwWuE

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA | Idea Spark | APPROVED | Not part of AI program formal track |
| CONCEPT | Concept Developed | APPROVED | Enter catch-up process |
| POC | PoC Validated | APPROVED | Enter catch-up process |
| PROTOTYPE | Prototype Approved | APPROVED | Enter catch-up process |
| PILOT | Pilot go/no-go | APPROVED CATCH UP | Enter catch-up process |
| OPERATION | Ready for Operation | NOT STARTED / IN CATCH UP | Catch-up and operation handover plan required |

## Status Update

This section is to be updated by the Project Lead or Project Manager regularly, to ensure progress information is easily available.

**30 Aug 2026** PLEXON v3 remains the staging island for federation contract `2026-05-plexon-federation-v3`; Collection is the sole user-facing project model; companion apps bind as capabilities. Production Coolify deploys stay on the legacy control-plane repo until catch-up and handover complete.

**Labels (suggested):** `ai_product` `msq_seed` `plexon` `suite_hub`

---

# CHECKION

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
CHECKION is a web-based SaaS capability that checks pages and domains for accessibility, SEO signals, and generative-engine visibility, then delivers prioritized findings and magazine-style summaries inside a PLEXON Collection.

**What measurable outcome does it deliver?**  
Teams get repeatable, evidence-based web quality and GEO visibility reports instead of ad-hoc screenshots and opinions, so issues can be tracked over time and handed to creators without inventing a new review process for every URL.

**Who is the target user group?**  
Primary: digital quality, accessibility, SEO, and content operations teams responsible for live websites. Secondary: MSQ DX clients and strategists who need proof of experience quality and AI-search visibility as part of larger CX or brand programs.

**What problem does this product solve, and what happens if we don't develop this product?**  
Website defects, weak metadata, and invisibility in AI answers stay anecdotal until damage is public. Without CHECKION, MSQ DX cannot productize scalable page and domain assurance, and clients keep relying on slow manual audits that do not fit Collection-based delivery.

**What makes this product compelling to a client or user?**  
One Collection-scoped workspace for quick single-page checks, deep domain scans, SEO crawls, and separated GEO model-memory versus live-search views, with magazine overviews for stakeholders and report depth for specialists.

**What do we already/need to have in place to be able to build this?**  
We need Collection binding from PLEXON, crawl permission for target domains, scan and job infrastructure, LLM access for GEO layers, and federation to plexon-v3 without inventing a second project system.

**What does done look like, and how will this product reach its users?**  
Done means any entitled Collection member can start approved scans, follow async jobs, read overview and issue detail, and publish distilled knowledge back to the Collection. Go-to-market: first capability in suite tutorials and retainers, then volume-tiered subscription by scan capacity.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | OPERATION |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — `https://checkion-v3.projects-a.plygrnd.tech` · MCP `https://checkion-v3-mcp.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA | Idea Spark | APPROVED | |
| CONCEPT | Concept Developed | APPROVED | |
| POC | PoC Validated | APPROVED | |
| PROTOTYPE | Prototype Approved | APPROVED | |
| PILOT | Pilot go/no-go | APPROVED CATCH UP | Tutorial-ready for first five entry paths |
| OPERATION | Ready for Operation | NOT STARTED | Product in Operation stage; catch-up plan and operation handover necessary |

## Status Update

**30 Aug 2026** Product Stage set to OPERATION (catch-up ongoing). First five tutorial paths defined (project create, WCAG single, WCAG deep, SEO crawl, GEO model memory). Async jobs and magazine-vs-report IA are product rules; ranking or accuracy percentage claims remain disallowed without evidence.

**Labels:** `ai_product` `msq_seed` `checkion` `capability`

---

# AUDION

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
AUDION is a web-based SaaS capability for building target groups, personas, and journeys, and for running synthetic audience research and persona conversations inside a PLEXON Collection.

**What measurable outcome does it deliver?**  
Teams replace one-off persona decks with living audience assets that can be reused in chats, studies, and Collection Flows, shortening the path from “who is this for?” to testable journey and quality work.

**Who is the target user group?**  
Primary: CX, UX research, and product teams who need shared audience truth across markets and touchpoints. Secondary: marketing and MSQ DX strategy teams who connect audience insight to CHECKION quality and brand programs.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without AUDION, audience understanding stays in slides and interviews that never connect to scans, brand checks, or designed outputs. MSQ DX then cannot close the loop from human insight to digital proof inside one Collection.

**What makes this product compelling to a client or user?**  
Personas and journeys become operable assets: teams can chat with them, run synthetic studies, and feed the same audience context into suite Flows instead of restarting research for every workstream.

**What do we already/need to have in place to be able to build this?**  
We need Collection binding, persona and study backends, journey-agent capacity where used, clear Live/Demo/Fixture labeling for demos, and federation with PLEXON orchestration.

**What does done look like, and how will this product reach its users?**  
Done means a Collection can bootstrap personas and target groups, run studies or persona chat, and pass audience context into Flows with CHECKION or brand steps. Go-to-market: bundled into CX and journey programs, then as a suite capability subscription.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | OPERATION |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — `https://audion-v3.projects-a.plygrnd.tech` · MCP `https://mcp-audion.projects-a.plygrnd.tech` · Journey agent `https://uxagent.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PROTOTYPE | gates | APPROVED | |
| PILOT | Pilot go/no-go | APPROVED CATCH UP | Verify Live vs Demo before client demos |
| OPERATION | Ready for Operation | NOT STARTED | Product in Operation stage; catch-up plan and operation handover necessary |

## Status Update

**30 Aug 2026** Product Stage set to OPERATION (catch-up ongoing). Staging companion active; tutorial wave still planning. Demo claims must be labeled Live, Demo, or Fixture. Persona chat remains owned by AUDION (including embed paths), not a second chat stack inside PLEXON.

**Labels:** `ai_product` `msq_seed` `audion` `capability`

---

# BRANDION

Created by Carolina Isfer, last updated on Aug 30, 2026 · ~3 minute read  
*(Align with existing Confluence page EU-SED-011; suite wording refined below.)*

## Summary

**What is the product?**  
Brandion is a web-based SaaS capability that holds brand guidelines and design tokens, checks uploaded documents and assets against that brand profile across typography, color, and tone of voice, and delivers a conformity score with specific findings per category.

**What measurable outcome does it deliver?**  
Reduction of manual brand review effort by 70 to 90% compared to human QA rounds. Teams get an instant, consistent brand compliance verdict on any asset, eliminating the bottleneck of routing materials through brand managers or agency reviewers before publication.

**Who is the target user group?**  
Primary: Brand managers, marketing teams, and content leads at companies with strict brand governance requirements and high document output, particularly those managing multiple agencies, markets, or internal teams producing brand-relevant materials. Secondary: MSQ DX clients where brand consistency across a large number of touchpoints and stakeholders is a constant operational challenge.

**What problem does this product solve, and what happens if we don't develop this product?**  
Brand inconsistency is pervasive in large organizations. Assets produced by different teams, agencies, or markets regularly deviate from brand standards, often going undetected until they are live. Manual review is slow, subjective, and unscalable. Without Brandion, companies continue to publish off-brand materials, brand equity erodes gradually, and MSQ DX misses an opportunity to productize a capability that sits directly at the intersection of its core CX and brand expertise.

**What makes this product compelling to a client or user?**  
Instant, objective brand compliance feedback without requiring a brand manager in the loop for every asset. The tool encodes brand knowledge once and applies it consistently at scale, removing the subjectivity of human review. For clients managing multiple agencies or markets, it acts as an always-on brand guardian. For MSQ DX, it is a natural fit within onboarding new client relationships and ongoing retainer work where brand quality assurance is recurring, and it is the guideline and token source of truth that CREATION consumes via the active pack.

**What do we already/need to have in place to be able to build this?**  
We need Collection binding in PLEXON, guideline and analysis-run storage, PDF-first evaluate pipelines, design-token export for CREATION, shared UI primitives, and catch-up readiness for operation handover.

**What does done look like, and how will this product reach its users?**  
Done means a self-service tool where a client uploads a brand profile once, then any team member can upload an asset and receive a structured conformity report with pass, fail, or warning status per brand dimension, exportable for handoff to creators or agencies, with the active pack available to CREATION. Go-to-market: initially as an add-on within brand strategy and design system projects at existing clients, then as a standalone subscription product. Pricing: tiered by number of brand profiles and monthly asset volume.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | EU-SED-011 |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | OPERATION |
| Project Status | CATCH UP |
| Teambox Number | 3000000.1426002 / Brandion \| EU-SED-011 |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | Carolina Isfer — EU-SED-011_Brandion (Brand Checker) |
| Product URL | Christoph Bordeck — `https://brandion-v3.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PILOT | gates | APPROVED / APPROVED CATCH UP | As on existing page |
| OPERATION | Ready for Operation | NOT STARTED | Catch-up plan and operation handover necessary |

## Status Update

**17 Jul 2026** Product still needs to be assessed against Catch-up criteria, and be refactored and prepared for Operation phase.

**14 Aug 2026** Product visuals being updated and functionalities being adjusted.

**30 Aug 2026** Positioned as Collection capability and guideline SSOT for CREATION active-pack consume; v3 shell-first rebuild continues under keep/drop backlog — do not port legacy dashboard chrome by default.

**Labels:** `ai_product` `msq_seed` `brandion` `capability`

---

# CREATION

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
CREATION is a web-based design and composition capability where teams build pages and layouts from a governed component library, with brand tokens supplied by Brandion, so the designed output remains valid, reviewable code inside a PLEXON Collection.

**What measurable outcome does it deliver?**  
Designers produce brand-aligned compositions that stay git-diffable and contract-valid, cutting the usual handoff loss between design tools and engineering while keeping brand tokens as the only styling language for designer edits.

**Who is the target user group?**  
Primary: designers and content designers composing client-facing pages and magazines within MSQ DX delivery. Secondary: developers who own the component library, and AI-assisted workflows that must stay inside the same edit contract.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without CREATION, brand and research insights stop at decks and PDFs, and production design happens in disconnected tools that diverge from code and from Brandion tokens. MSQ DX then cannot finish the suite journey from insight to published surface under one Collection.

**What makes this product compelling to a client or user?**  
Code is the source of truth with a limited, safe editing surface for designers, automatic rejection of invalid edits, and direct consumption of Brandion’s active pack so brand governance and layout production stay connected.

**What do we already/need to have in place to be able to build this?**  
We need Collection binding, Brandion active-pack export, the CREATION/Zaoly editor and library contracts, optional SPIRION reference packs for craft guidance, and staging companions under plexon-v3 federation.

**What does done look like, and how will this product reach its users?**  
Done means a Collection member opens CREATION in project context, composes pages with library components and Brandion tokens, and exports or publishes outputs such as site kits or magazine PDFs. Go-to-market: bundled into design-system and brand programs after Brandion setup, then as a suite creation seat subscription.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | PILOT |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — `https://creation-v3.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PROTOTYPE | gates | APPROVED | Zaoly constitution and specs as build SoT |
| PILOT | Pilot go/no-go | APPROVED CATCH UP | Editor and Collection context must be verified |
| OPERATION | Ready for Operation | NOT STARTED | Catch-up and handover plan required |

## Status Update

**30 Aug 2026** Federated as CREATION companion; Brandion remains guideline SSOT and CREATION consumes active pack only — no CREATION-only path aliases. Tutorials planned after Collection-context smoke.

**Labels:** `ai_product` `msq_seed` `creation` `capability`

---

# SPIRION

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
SPIRION is a design-reference intelligence capability that searches real UI captures and reference packs so teams can inform layout craft before composing in CREATION, always scoped as a Collection capability rather than a separate project product.

**What measurable outcome does it deliver?**  
Creative teams start from curated visual references and prompt packs instead of invented moodboards, reducing false starts and aligning density, rhythm, and structure guidance before production design begins.

**Who is the target user group?**  
Primary: designers and creative leads preparing layouts for client work. Secondary: PLEXON assistant and CREATION agent workflows that need grounded visual references inside a Collection.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without SPIRION, reference work stays as unstructured screenshots and personal folders that never enter the suite. Design quality then depends on individual taste, and CREATION craft lacks a shared, searchable reference layer.

**What makes this product compelling to a client or user?**  
It turns real capture libraries into actionable reference packs that the assistant and CREATION can use, without inventing a second project model or copying foreign brands one-to-one.

**What do we already/need to have in place to be able to build this?**  
We need SPIRION UI and API/MCP endpoints, capture corpus access, Collection binding for scoped search, and clear communication that SPIRION is a capability mirror, not a standalone project system.

**What does done look like, and how will this product reach its users?**  
Done means Collection users can search references, assemble a pack, and hand craft guidance into CREATION or assistant flows. Go-to-market: enablement inside design and creation workstreams; position as suite integration, not a separate product journey.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | PILOT |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — UI `https://dig.projects-a.plygrnd.tech` · MCP `https://spirion-api.projects-a.plygrnd.tech/mcp` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PROTOTYPE | gates | APPROVED | Formerly communicated as DIG |
| PILOT | Pilot go/no-go | APPROVED CATCH UP | Explain as integration / capability |
| OPERATION | Ready for Operation | NOT STARTED | Catch-up and handover plan required |

## Status Update

**30 Aug 2026** Capability mirror in Collection provisioning; marketing must not invent a SPIRION-only project type. Tutorials after app audit.

**Labels:** `ai_product` `msq_seed` `spirion` `capability`

---

# ECHON

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
ECHON is a research companion that turns news and market signals into waves, watchlists, foresight views, and cited research briefings so strategy teams can see what is moving and why.

**What measurable outcome does it deliver?**  
Teams answer a closed set of market questions with sourced briefings and quality-gated research instead of raw newsfeeds, improving speed and traceability of near-term foresight decisions.

**Who is the target user group?**  
Primary: strategy, research, and foresight leads who need continuous market contextualization. Secondary: MSQ DX suite journeys that start with market movement before audience, quality, and brand work.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without ECHON, market reading stays as unread alerts and slide decks without waves, citations, or shared memory. The suite then starts mid-funnel and misses the upstream “what is moving?” step that makes later CX and brand work timely.

**What makes this product compelling to a client or user?**  
Daily pulse, tagged waves, research with sources, and foresight momentum in one companion that can feed suite narratives without pretending to be another Collection project mirror.

**What do we already/need to have in place to be able to build this?**  
We need the ECHON research stack and corpus, vector and enrichment capacity, MCP exposure for agents, and clear suite messaging that ECHON is a companion outside the five capability mirrors.

**What does done look like, and how will this product reach its users?**  
Done means users can move from daily pulse to wave to cited briefing and optionally hand insight into suite journeys. Go-to-market: research and strategy retainers first, then suite companion add-on after integration smoke.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | PILOT |
| Project Status | CATCH UP |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — `https://echon-v3.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PROTOTYPE | gates | APPROVED | V3 rebuild spec-driven |
| PILOT | Pilot go/no-go | IN CATCH UP | Tutorials planned after integration check |
| OPERATION | Ready for Operation | NOT STARTED | Catch-up and handover plan required |

## Status Update

**30 Aug 2026** Suite positioning locked: companion, not one of the five Collection capability mirrors. Staging companion URL wired in PLEXON paths.

**Labels:** `ai_product` `msq_seed` `echon` `companion`

---

# VIDEON

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
VIDEON is a video analysis and media workspace that makes video searchable and reusable through scenes, transcripts, semantics, and export paths into editing tools.

**What measurable outcome does it deliver?**  
Media teams find and reuse footage and meaning instead of depending on filenames and manual scrubbing, lowering cost of search and re-edit across campaigns.

**Who is the target user group?**  
Primary: post-production, media operations, and marketing teams with large video libraries. Secondary: MSQ DX storytelling programs that complement web, brand, and audience work once suite integration exists.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without VIDEON, video remains an opaque file store while web and brand assets become governable in the suite. MSQ DX then cannot offer a complete media quality story and leaves video outside Collection-based delivery.

**What makes this product compelling to a client or user?**  
A media library with analysis, search, and export into production tools, positioned as the video counterpart to CHECKION and Brandion governance once federation is active.

**What do we already/need to have in place to be able to build this?**  
We need the VIDEON service stack, storage, and analysis pipelines, plus a verified PLEXON Collection binding and launch path before treating it as an active suite product.

**What does done look like, and how will this product reach its users?**  
Done for suite purposes means upload, analyze, search, and export inside Collection context with a canonical product URL. Go-to-market: roadmap and preview only until active suite integration; then media retainers and suite add-on.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | PROTOTYPE |
| Project Status | ROADMAP (suite) |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | TBD — no canonical suite staging FQDN in PLEXON paths yet |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| IDEA → PROTOTYPE | gates | IN PROGRESS / APPROVED locally | Product exists in repo |
| PILOT | Pilot go/no-go | NOT STARTED (suite) | Requires active PLEXON integration |
| OPERATION | Ready for Operation | NOT STARTED | |

## Status Update

**30 Aug 2026** Suite knowledge base treats VIDEON as roadmap/preview only until actively integrated. Do not sell as a live Collection capability journey yet.

**Labels:** `ai_product` `msq_seed` `videon` `roadmap`

---

# MSQDX UI (Design System) — optional internal product page

Created by Christoph Bordeck, last updated on Aug 30, 2026 · ~3 minute read

## Summary

**What is the product?**  
MSQDX UI is the shared design-system library and token layer that supplies the visual and interaction primitives used across PLEXON and the companion apps.

**What measurable outcome does it deliver?**  
One component and token source of truth reduces duplicate UI work and keeps suite surfaces visually and behaviorally consistent, with Storybook as the always-on catalog for review.

**Who is the target user group?**  
Primary: product engineering and design-system owners. Secondary: every app team consuming `@msqdx/ui` and `@msqdx/ui-tokens`.

**What problem does this product solve, and what happens if we don't develop this product?**  
Without a central UI system, each app invents parallel chrome, increasing cost and breaking the suite experience. MSQ DX then cannot present one coherent platform to clients or internal operators.

**What makes this product compelling to a client or user?**  
For operators and builders: faster delivery and consistent magazine, chat, shell, and flow patterns. For clients: a recognizable suite quality bar rather than mismatched product UIs.

**What do we already/need to have in place to be able to build this?**  
Specs-first primitive process, Storybook staging, consumer pinning in app builds, and Brandion/DS-DEPOSIT paths where tokens are promoted into Collection brand packs.

**What does done look like, and how will this product reach its users?**  
Done means primitives ship with stories and tests, Storybook stays live, and consuming apps pin the library. Go-to-market: internal platform enablement; not an end-customer SKU.

## Overview

| Field | Value |
|-------|-------|
| Asset Reference | TBD (Program Manager) |
| Last Updated | 30 Aug 2026 |
| Project Lead | Christoph Bordeck |
| Product Stage | OPERATION |
| Project Status | ACTIVE (internal) |
| Teambox Number | TBD (Program Manager) |
| Allocated Budget | AI Squad |
| AI Squad Involvement | Yes |

## Resources

| Resource | Owner / link |
|----------|----------------|
| Sharepoint | TBD |
| Product URL | Christoph Bordeck — Storybook `https://ds.projects-a.plygrnd.tech` |
| Figma | @ |
| Miro | @ |
| Controlling | @ |
| Jira | Carolina Isfer — https://jira.udg.de/projects/PLEXION/summary |
| Loop workspace | @ |
| Teams Chat | @ |
| Claude Project | @ |

## Team

| Role | Name |
|------|------|
| Project Lead | Christoph Bordeck |
| Product Owner | @ |
| Tech Lead | @ |
| Design lead | @ |
| Project Manager | @ |
| Sponsor | Uwe Todoroff |

## Milestones

| Phase | Gate | Status | Note |
|-------|------|--------|------|
| OPERATION | Ready for Operation | IN OPERATION (internal) | Always-on Storybook staging |

## Status Update

**30 Aug 2026** Shared primitives are mandatory for rebuilt suite surfaces; app-local replacements for central primitives are out of policy.

**Labels:** `ai_product` `msq_seed` `msqdx_ui` `platform`

---

# Suite parent blurb (optional cover page)

**PLEXON Suite — AI Products**

PLEXON is the Collection hub. Five capability mirrors ship with a Collection: CHECKION, AUDION, BRANDION, CREATION, SPIRION. ECHON is a research companion. VIDEON is roadmap until suite integration. MSQDX UI is the internal design system.

Suggested decision chain for stakeholders:

Market movement (ECHON) → Audience (AUDION) → Experience quality (CHECKION) → Brand (BRANDION) → Designed output (CREATION, with SPIRION references) → Context retained in PLEXON.

---

## Publishing checklist for Program Manager

1. Create parent page under the AI Products / Catch-up space.
2. Create one child page per product using sections above.
3. Fill `TBD (Program Manager)` fields: Asset Reference, Teambox, Sharepoint, open team roles.
4. Keep Brandion EU-SED-011 values; update Status Update only.
5. Apply labels: `ai_product`, `msq_seed`, plus product slug.
6. After Atlassian MCP auth in Cursor, pages can be created/updated via API instead of paste.
