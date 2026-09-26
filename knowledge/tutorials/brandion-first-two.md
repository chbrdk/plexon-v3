# BRANDION — die ersten zwei Quick Starts

## Serienziel

Zwei kurze Folgen ersetzen den alten „Detection Lab“-Einstieg durch den aktuellen Produktpfad: **Measured evaluate** und **Guideline Active**.

| Folge | ID | Titel | Zieldauer | Ergebnis |
|---:|---|---|---:|---|
| 1 | BRN-QS-01 | PDF im Measured evaluate prüfen | 3–5 Min. | Pass/Fail-Findings zu einer Demo-PDF |
| 2 | BRN-QS-02 | Guideline öffnen und aktivieren | 2:30–4 Min. | Status Active; Pack-Wahrheit der Collection |

Reihenfolge bei Aufnahme: oft **QS-02 vor QS-01**, wenn noch keine Active Guideline existiert. Im Lernpfad bleiben die IDs wie im Programm; der Sprechertext verweist gegeneinander.

## Produktwahrheit (2026-09)

- `/detection-lab` → Redirect auf `/analysis` — **nicht** als eigener Hub filmen.
- UI-Titel Analysis: **Measured evaluate**; Primary = PDF/Image-Upload; Lab evidence = sekundär.
- Active Guideline demoted andere Guidelines derselben Collection (`statusHint`).
- CREATION Consume: `GET /api/guidelines/active-pack?platformProjectId=` — im Quick Start nur erwähnen.

## Gemeinsame Demo-Grundlage

- Staging: `https://brandion-v3.projects-a.plygrnd.tech`
- Kontrollierte PDFs unter `/fixtures/` (z. B. `pdf-porsche-pds.pdf`, `cd-test-measure.pdf`)
- Eigene Tutorial-Guideline anlegen; Production-Deposit (`gl-msrxlt4u`) nur mit Freigabe

## Redaktionsregeln

1. Collection statt „Brandion-Projekt als zweites Projektmodell“.
2. Detection Lab nicht als Produktname verwenden.
3. Failed-Findings nicht als „Marke kaputt“ dramatisieren — als Regelabweichung erklären.
4. Live / Demo / Fixture vor Aufnahme markieren.
5. Keine Kundendaten in Bildern.

## Dateien

- `brandion-01-measured-evaluate-pdf.md`
- `brandion-02-guideline-activate.md`
