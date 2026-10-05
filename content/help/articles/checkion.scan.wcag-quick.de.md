# WCAG-Quick-Scan starten

Ein **WCAG-Quick-Scan** prüft **eine URL** auf grundlegende Barrierefreiheit im Collection-gebundenen CHECKION-Workspace. Das ist der schnellste sinnvolle Einstieg vor einem Deep Crawl.

## Schritte

1. CHECKION aus deiner Collection öffnen.
2. **New scan** → **WCAG** → **Quick single scan** wählen.
3. Exakte Seiten-URL (vollständiger `https://`-Pfad) eingeben, die du testen darfst.
4. Collection prüfen („Project“ in der UI ist der lokale Capability-Datensatz dieser Collection).
5. **Launch single scan** — Job wird eingereiht; Start ist **nicht** der fertige Report.
6. **Jobs** öffnen. Bei **Completed** das Ergebnis öffnen.
7. Orientieren: **Overview** (schwächste Signale zuerst) → **Issues** (was / wo / Fix) → **Detail** (technische Meter).

## Ergebnis lesen

- Overall Score ist Orientierung, kein Ersatz für Findings.
- Scoreline ist **weakest first**.
- Wiederholte Regel-Treffer können gruppiert sein; Gruppen später im Deep Scan als Muster lesen.

## Regeln

- Nur Domains mit Freigabe crawlen.
- Eine Startbestätigung ist kein Score.

## Weiter

- [Einstieg](checkion.getting-started)
- [Domain-Deep-Scan](checkion.scan.domain-deep)
- [GEO-Schichten](checkion.scan.geo-layers)
