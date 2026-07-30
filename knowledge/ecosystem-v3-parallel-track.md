# PLEXON Ökosystem v3 — Parallelspur (Coolify)

**Status:** Policy 2026-07-30  
**Scope:** gesamtes Ökosystem, nicht nur AUDION  
**Contract-Ziel:** `2026-05-plexon-federation-v3` (Produkte migrieren nacheinander)

## Prinzip

Es gibt zwei Welten:

1. **v2 / Prod (Coolify heute)** — unverändert weiterlaufen: PLEXON, CHECKION, AUDION-v2, BRANDION, VIDEON, ECHON-v2, …  
2. **v3 / Parallelspur** — neues Coolify-**Environment** (oder Projekt-Gruppe) mit eigenen Domains, DBs, Secrets. Kein Cutover, bis bewusst freigegeben.

v3 ist **eine Plattform-Generation**, nicht „nur eine App“.

## Produktkarte

| Produkt | v2 / Prod (nicht anfassen) | v3-Spur | Stand 2026-07-30 |
|---------|----------------------------|---------|------------------|
| **PLEXON** | Coolify Prod Control Plane (`chbrdk/PLEXON`) | Repo **`chbrdk/plexon-v3`** → Coolify App `plexon-v3` (Staging) | Contract v3 + eigene Domains/DB/Secrets |
| **AUDION** | `AUDION-v2` Coolify | `audion-v3` Repo | Wave 1 Federation + Magazine UI |
| **CHECKION** | `CHECKION` Coolify | `checkion-v3` (Repo oder Branch-Track) | noch Prod-v2; Federation heute v2-Contract |
| **ECHON** | `msqdx-echon/v2` | `msqdx-echon/v3` | Codepfad existiert; Coolify-v3 separat |
| **BRANDION** | `brandion` Coolify | `brandion-v3` Track | später |
| **VIDEON** | `videon` Coolify | `videon-v3` Track | später |
| **CREATION** / andere | jeweiliges Prod | nur wenn explizit im v3-Board | optional |

Shared nur über **Plexon-Vertrag** (Auth, Profile, Platform Projects, Usage) — nie über gemeinsame Product-Postgres.

## Coolify-Layout (Soll)

```
Coolify Environment: msqdx-prod-v2     ← Freeze außer kritische Fixes
  plexon, checkion, audion-v2, brandion, videon, echon-v2, …

Coolify Environment: msqdx-v3-staging  ← neue Insel
  plexon-v3
  audion-v3
  checkion-v3   (wenn Track startet)
  echon-v3
  … (weitere wenn ready)
```

**Regeln**

- Eigene Domains: `*.v3.…` oder `*-v3.…` — nie Prod-Hostname wiederverwenden  
- Eigene Postgres pro Control Plane + pro Product (wenn Product-DB kommt)  
- Eigene `PLEXON_SERVICE_SECRET` / `AUTH_SECRET` für die v3-Insel  
- v3-Produkte zeigen nur auf **plexon-v3**; Prod-Produkte nur auf **plexon-prod**  
- Keine Cross-Env `DATABASE_URL` (kein v3 → v2-DB)

## Contract

| Generation | Version | Nutzung |
|------------|---------|---------|
| Prod / v2 | `2026-05-plexon-federation-v2` | CHECKION + AUDION-v2 + Plexon Prod |
| v3-Spur | `2026-05-plexon-federation-v3` | AUDION-v3 (live); weitere Produkte folgen |

Beide dürfen parallel existieren. Ein Product spricht **eine** Version gegen **eine** Plexon-Instanz.

## Rollout-Wellen (Ökosystem)

### Wave A — Insel stehen (Ops)
1. Coolify Environment `msqdx-v3-staging` anlegen  
2. `plexon-v3` deployen aus Repo **`chbrdk/plexon-v3`** (eigene DB, eigene Domain) — nicht aus Prod-`PLEXON`  
3. `audion-v3` daran hängen (bereits Wave-1-fähig)  
4. Smoke: Login, Profile, Project Origin, Usage-Event  

### Wave B — zweite Linse
5. CHECKION-v3 Track (Magazin/UI-Rebuild oder gezielter Fork) + Federation v3 gegen plexon-v3  
6. ECHON-v3 Staging gegen plexon-v3 (Tenancy später, Identity zuerst)  

### Wave C — Rest + Parity
7. BRANDION / VIDEON v3 Tracks nach Bedarf  
8. Product-Postgres je Service in der v3-Insel  
9. Cutover pro Produkt (DNS/Flag) — nie Big-Bang gesamtes Ökosystem ohne Freigabe  

## Ownership (unverändert gültig)

| Daten | Owner |
|-------|--------|
| Users, Companies, Entitlements, Platform Projects, Usage | **Plexon** |
| Personas, Scans, Brand Assets, Videos, Research Domains | **jeweiliges Product** (eigene DB in v3) |

## Verweise

- **Coolify Runbook (Ops):** `knowledge/coolify-v3-staging-runbook.md` — Env-Matrix, Deploy-Order, Domains  
- **plexon-v3 Env Cheat-Sheet:** `knowledge/coolify-plexon-v3-env-cheatsheet.md` — Copy-Paste für Coolify  
- **Coolify Repo-Switch:** `knowledge/coolify-switch-to-plexon-v3-repo.md`  
- **Smoke A6/A10:** `knowledge/federation-smoke-a6-a10.md`  
- **Repo origin:** `knowledge/repo-origin.md`  
- AUDION Trennung: `audion-v3/knowledge/v2-v3-runtime-separation.md`  
- AUDION Federation: `audion-v3/knowledge/plexon-federation.md`  
- AUDION Deploy URLs: `audion-v3/knowledge/deploy-urls.md`  
- Contract SoT: `PLEXON/knowledge/platform-federation-contract.md` (v2; v3 parallel)  
- Registry: `PLEXON/lib/platform-products.ts` — v3-Surfaces als eigene Einträge / Env-URLs, nicht Prod überschreiben  
