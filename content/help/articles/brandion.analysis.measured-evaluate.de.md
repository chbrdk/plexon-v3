# PDF im Measured evaluate prüfen

**Measured evaluate** (Navigation: **Analysis**, Pfad `/analysis`) vergleicht ein PDF oder Bild mit der gewählten Guideline. Es ersetzt den alten Detection-Lab-Hub (nur Redirect — Lab nicht als Produktname behandeln).

Primärpfad: **Document evidence** hochladen. Lab evidence (CSS / DTCG-Paste) ist sekundär — für diesen Workflow zugeklappt lassen.

## Schritte

1. BRANDION öffnen → **Analysis** (Measured evaluate).
2. Ziel-**Guideline** wählen (möglichst die Active Guideline der Collection).
3. Unter **Primary evidence** / Document **Choose file…** und ein kontrolliertes Demo-PDF wählen.
4. Auto-detect zeigt **Detected: PDF** (Bilder sind ebenfalls unterstützt).
5. Seiten-URL leer lassen, wenn PDF Primary ist.
6. **Run evaluate** — **Running…** abwarten; das ist noch kein Endurteil.
7. **StatLede** lesen: Passed / Failed / Skipped, danach **Findings** öffnen.
8. Optional **Recent runs** in der History prüfen.

## Ergebnis lesen

- Jedes Finding bezieht sich auf eine Guideline-Regel — kein Ranking-Versprechen.
- Failed > 0 heißt **nicht** „Marke ist compliant“; ehrlich interpretieren.
- Unmapped-Token-Banner führen zurück ins Guideline-Studio — Tokens/Rules prüfen, dann erneut laufen lassen.

## Regeln

- Keine Kunden-PDFs ohne Freigabe; Staging-Fixtures oder freigegebene Demos nutzen.
- Ohne Guideline zuerst eine aktivieren oder anlegen.

## Weiter

- [Einstieg](brandion.getting-started)
- [Guideline aktivieren](brandion.guidelines.activate)
