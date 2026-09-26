# BRN-QS-02 — Guideline öffnen und aktivieren

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Quick Start |
| Zieldauer | 2:30–4 Minuten |
| Zielgruppe | Neue BRANDION-Nutzer:innen, Brand Owner |
| Oberfläche | BRANDION `/guidelines` → `/guidelines/:id` |
| Lernziel | Eine Guideline als **Active** setzen und verstehen, dass genau eine Active Guideline pro Collection das Pack für CREATION und Evaluate liefert |
| Erfolg | Status zeigt **Active**; Hinweis „Active demotes other guidelines on the same collection“ ist nachvollziehbar |

## Terminologie

- **Guideline** = Markenregelwerk (Tokens + Compliance) im BRANDION-Capability-Datensatz einer PLEXON **Collection**.
- **Active** = die für `active-pack` und CREATION-Consume gültige Guideline der Collection.
- UI-Labels (EN): **New guideline**, **Activate**, Status **Draft** / **Active** / **Archived**.

Sprechertext:

> „Wir aktivieren die Guideline der Collection. Nur die aktive Guideline ist das Pack, das CREATION und Measured evaluate als Markenwahrheit nutzen.“

## Voraussetzungen

- Angemeldet in BRANDION Staging oder freigegebener Demo.
- Mindestens eine Guideline existiert (oder wird in diesem Tutorial als Draft angelegt).
- Collection-/Project-Bindung bekannt, wenn gefiltert (`/guidelines?projectId=`).
- Vor Aufnahme: Activate einmal testen; zweite Guideline darf demoted werden.

## Beispieldaten

| Feld | Beispiel |
|---|---|
| Name | PLEXON Tutorial Brand |
| Status Start | Draft |
| Status Ziel | Active |
| Optional Staging-Referenz | MSQ DX Deposit Collection `platformProjectId` `32498667-471e-4b21-b920-5eff5c338300` · Guideline `gl-msrxlt4u` (nur wenn freigegeben und bereinigt) |

Für öffentliche Tutorials lieber eine **eigene Demo-Guideline** anlegen statt Production-Deposit zu zeigen.

## Klickpfad

1. BRANDION öffnen.
2. Rail **Guidelines** wählen.
3. Optional: Filter/Search auf die Demo-Collection eingrenzen.
4. Bestehende Karte öffnen **oder** **New guideline** → Name setzen → Create → Studio öffnet.
5. Im Studio Status prüfen (**Draft** / **Active** / **Archived**).
6. **Activate** wählen (oder Status auf **Active** setzen — je nach aktuellem Dialog).
7. Bestätigen, dass Status **Active** ist und ggf. eine andere Guideline derselben Collection nicht mehr Active ist.
8. Kurz Design-Tokens-Kapitel zeigen (ohne tiefes Editieren).
9. CTA: zurück zu **Analysis** für einen Measured-Run (BRN-QS-01) oder Tokens pflegen (BRN-CORE-01).

## Storyboard und Sprechertext

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Guidelines-Magazin | „Jede Collection braucht ein aktives Markenpack. Das legen wir in BRANDION als Guideline fest.“ | Guidelines |
| 00:15 | Karten / Status-Chips | „Draft, Active und Archived beschreiben den Lebenszyklus — Active ist die Wahrheit der Collection.“ | Draft · Active · Archived |
| 00:35 | New guideline oder bestehende Karte | „Wir öffnen unsere Tutorial-Guideline.“ | Guideline öffnen |
| 00:55 | Studio — Status / Activate | „Activate setzt diese Guideline aktiv. Andere Guidelines derselben Collection werden dabei zurückgestuft.“ | Activate |
| 01:20 | Status Active sichtbar | „Jetzt ist das Pack aktiv. CREATION kann es über active-pack lesen; Measured evaluate misst dagegen.“ | Active |
| 01:45 | Design Tokens Kapitel kurz | „Hier liegen Farben, Typo und weitere Tokens — die pflegen wir im Kernworkflow. Heute reicht die Aktivierung.“ | Tokens |
| 02:10 | Rail Analysis | „Als Nächstes prüfen wir ein PDF gegen genau diese Guideline.“ | Als Nächstes: Measured evaluate |

## Erwarteter Endzustand

- Guideline-Status **Active**
- Studio erreichbar unter `/guidelines/{id}`
- Nutzer:in versteht: eine Active Guideline pro Collection
- Keine Behauptung, dass CREATION bereits Tokens „gezogen“ hat, ohne CREATION-Oberfläche zu zeigen

## Wahrheitsstatus

| Umgebung | Kennzeichnung |
|---|---|
| Staging mit Postgres + Session | **Live** |
| Memory-Fixture ohne Persistenz | **Fixture** — Activate ggf. nur Session-lokal |
| CREATION Consume in diesem Clip | **Nicht zeigen** — nur ansprechen |

## Fehlerpfade

| Situation | Erklärung |
|---|---|
| Activate fehlt / disabled | Rechte oder bereits Active; Status-Feld im Edit-Dialog prüfen. |
| Falsche Collection | Project-Filter / `platformProjectId` Launch aus Plexon nutzen. |
| Archive statt Active | Nicht als Erfolgsende darstellen. |
| Mehrere Active sichtbar | Bug oder Stale UI — vor Aufnahme Support/Reload; Tutorial stoppen. |

## Aufnahmeplan

- Original + Highlight: Guidelines-Hub, Activate-CTA, Active-Chip, optional Tokens-Kapitel-Kopf
- Keine Kundennamen; Deposit-Collection nur mit Freigabe
- Nach Activate kurz History/Liste zeigen, dass andere demoted sind

## Nächste Folge

**BRN-CORE-01** — Design Tokens und Markenregeln pflegen · oder Rückkehr zu **BRN-QS-01**, falls Evaluate noch fehlt.
