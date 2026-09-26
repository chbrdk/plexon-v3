# Jev Act / Shadow Soak — 2026-09-26

Kurz-Snapshot aus Live-Logs (Coolify + SSH `projects-01`). **Keine Flag-/Deploy-Änderungen.**

| App | UUID | Host | Container start (UTC) |
|-----|------|------|------------------------|
| plexon-v3 | `n6f9gy85xsk3a0txflzavk3j` | `v2202512309949414952.luckysrv.de` | `2026-09-26T11:03:18Z` (~wenige Min. Uptime beim Sample) |
| echon-v3 API | `wckcahadnuy7vv4yrjxf6fbm` | dieselbe | `2026-09-26T10:48:49Z` (~19 Min. beim Sample) |

Plexon-Image-Tag: `n6f9…:025a872da116d16696868b5e4c3cc525058774f5`. Coolify `updated_at` / `last_online_at` ≈ `2026-09-26T11:04Z`.

Env-Keys (Namen only): Plexon hat `JEV_SHADOW_ENABLED`, `JEV_ACT_ASSISTANT_INTENT`, `JEV_ACT_ASSISTANT_PLANNER`, `JEV_MODEL_ID`, `JEV_TIMEOUT_MS`, `OPENROUTER_*`. Echon hat zusätzlich `JEV_ACT_ECHON_LIGHT_CLASSIFY`, `JEV_ACT_ECHON_NEWS_RADAR`, `JEV_SHADOW_ECHON_*`, `ECHON_V3_CLASSIFY_PROVIDER`.

---

## Plexon — Assistant Act/Shadow

| Metrik | Wert |
|--------|------|
| `[jev-act]` Zeilen | **0** |
| `[jev-shadow]` Zeilen | **0** |
| Container-Log (seit Start) | ~112 Zeilen, nur Bootstrap / Next ready / Flow-Scheduler |
| Coolify `get_logs` | ebenfalls nur Startup (kein Assistant-Traffic) |

**Fazit:** Zero Jev-Logs — **erwartet**, solange nach dem Redeploy kein Assistant-Traffic läuft. Act-Flags sind gesetzt (Key-Namen vorhanden), aber ohne Turns gibt es keine `[jev-act]`-/`[jev-shadow]`-Evidenz. Frühere Container-Logs sind nach Redeploy weg.

Pro `useCaseId` (`assistant.intent` / `assistant.planner`): count / agree / applied / error / latency / cost = **n/a** (kein Sample).

---

## Echon (optional) — Shadow-Logs + SQL

Quelle: `docker logs` API-Container, Filter `jev-act|jev-shadow` → **312** Zeilen, alle Tag `jev-shadow` (**0** `jev-act`-Tags in diesem Fenster). Model pin in Logs: `typesafe/jev-1.13-20260917`.

| useCaseId | n | agree % | applied % | error / jev=null % | latency p50 / p95 (ms) | cost sum USD | cost / 1k USD |
|-----------|---|---------|-----------|--------------------|------------------------|--------------|---------------|
| `echon.light_classify` | 156 | **12,8 %** (volle Baseline↔Jev) | n/a (kein `applied` im Shadow-Log) | **0 %** | **303 / 415** | 0,00766 | **0,0491** |
| `echon.news_radar` | 156 | 100 %* | n/a | **0,6 %** (1× `The read operation timed out`) | **304 / 445** | 0,00959 | **0,0614** |

\*News-Radar: `baseline` ist durchgängig `null` → `agree: true` ist **kein** Heuristik-Vergleich, sondern „Jev lieferte ein Result“. Aussagekräftig: Fehlerquote, Latenz, Cost, Triage-Mix.

Zusatz light_classify (gleiche 156): Kategorie-only agree **12,8 %**, Sentiment-only **17,9 %** (sehr dünne Übereinstimmung mit Rules-Baseline — Shadow-Vergleich, Act separat).

News-Radar Triage im Log-Sample: watch 122 · noise 19 · act_now 14 (1 Fail ohne Triage).

### SQL Coverage (`echon_v3.signals`, SSH `docker exec` Postgres)

| Metrik | N |
|--------|---|
| `signal_count` | **7083** |
| mit `dimensions.news_radar` (object) | **1116** (~**15,8 %**) |

(Zum Vergleich früherer Soak am selben Tag: 6764 / 779 ≈ 11,5 % — Coverage steigt mit laufendem Persist.)

---

## Lesart / nächste Schritte

1. **Plexon Soak braucht Assistant-Traffic** nach dem Flip-Deploy; sonst bleiben Act-Metriken leer.
2. Echon Shadow läuft und ist latenzseitig unter typischem 800 ms-Budget (p95 ≈ 415–445 ms); Cost/1k im Sample klein.
3. Light-classify Full-Agree vs. Rules-Baseline ist niedrig — bei Act-Flip weiter Eval/`scripts/eval_light_classify.py` und Kategorie-Delta tracken, nicht nur Live-Shadow-Agree.
4. Rollback unverändert: `JEV_ACT_*=0` (+ Echon classify provider zurück), kein Deploy nötig für diesen Report.

Siehe auch: `knowledge/jev-flip-runbook.md`, `knowledge/jev-p0-act-residual-2026-09-26.md`, Echon `v3/knowledge/news-radar-soak-2026-09-26.md`.
