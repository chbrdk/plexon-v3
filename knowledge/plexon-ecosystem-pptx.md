# PLEXON Ökosystem – PowerPoint (Enablement)

Stand: 2026-07-17

## Zweck

Stakeholder-Slides zu **AUDION**, **CHECKION**, **BRANDION**, **VIDEON**, **ECHON** und ihrer Einbettung in **PLEXON**: Funktionen, Mehrwert, Zusammenspiel — mit erklärenden Leads (nicht nur Stichworte).

## Quellen

| Produkt | Quelle |
|---------|--------|
| AUDION | `AUDION-v2/knowledge/audion-oekosystem-one-pager.md`, `audion-funktionen-und-use-cases.md` |
| CHECKION | `CHECKION/knowledge/checkion-oekosystem-one-pager.md`, `checkion-funktionen-und-use-cases.md` |
| BRANDION | `brandion/BRANDION/knowledge/brandion-oekosystem-one-pager.md`, `brandion-funktionen-und-use-cases.md` |
| VIDEON | `videon/knowledge/videon-oekosystem-one-pager.md`, `videon-funktionen-und-use-cases.md` |
| ECHON | `msqdx-echon/v2/knowledge/ECHON-funktionen-use-cases-und-nutzerwert.md`, `PLEXON/knowledge/echon-mcp-integration.md` |
| PLEXON | `knowledge/platform-surface-ownership.md`, `lib/platform-products.ts` |

## Artefakte

| Was | Pfad |
|-----|------|
| Generator | `scripts/generate-plexon-ecosystem-pptx.mjs` |
| Output | `assets/presentations/plexon-oekosystem.pptx` (`lib/paths/ecosystem-pptx.ts`) |
| Test | `__tests__/plexon-ecosystem-pptx.test.ts` |
| npm | `npm run generate:ecosystem-pptx` |

## Folienstruktur (12)

1. Titel – PLEXON Ökosystem (inkl. ECHON)  
2. Agenda  
3. Warum dieses Ökosystem? (Problem / Versprechen / Zusammenhalt)  
4. PLEXON als Hub  
5. Fünf Linsen (Überblick)  
6. AUDION  
7. CHECKION  
8. BRANDION  
9. VIDEON  
10. ECHON  
11. Zusammenspiel & Synergien  
12. Kampagnen-Szenario + Nutzenstufen  

## Kernfragen

| Produkt | Frage |
|---------|--------|
| CHECKION | Wie steht unsere Site – technisch, barrierefrei, in KI-Suche? |
| AUDION | Wie könnte die Zielgruppe reagieren? |
| BRANDION | Passt dieses Material zu unseren Markenregeln? |
| VIDEON | Was steckt im Video – und wie nutzen wir es wieder? |
| ECHON | Was bewegt den Markt – Signals, Waves, Research? |
| PLEXON | Ein Account, Usage, Orchestrierung (Assistent / Board / MCP) |

## Regenerieren

```bash
cd PLEXON && npm run generate:ecosystem-pptx
```
