#!/usr/bin/env python3
"""Generate Exyte SEO gap analysis PDF (PLEXON / CHECKION / AUDION)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "knowledge" / "exyte-seo-tooling-gap-analyse.pdf"

# Brand-ish palette
MSQDX_DARK = colors.HexColor("#1a1a2e")
MSQDX_ACCENT = colors.HexColor("#6366f1")
MSQDX_LIGHT = colors.HexColor("#f4f4f8")
CHECKION = colors.HexColor("#0d9488")
PLEXON = colors.HexColor("#6366f1")
AUDION = colors.HexColor("#d97706")
OK = colors.HexColor("#16a34a")
WARN = colors.HexColor("#ca8a04")
NO = colors.HexColor("#dc2626")


def status_cell(text: str) -> str:
    mapping = {
        "✅": '<font color="#16a34a">●</font>',
        "⚠️": '<font color="#ca8a04">●</font>',
        "❌": '<font color="#dc2626">●</font>',
        "Hoch": '<font color="#16a34a"><b>Hoch</b></font>',
        "Mittel": '<font color="#ca8a04"><b>Mittel</b></font>',
        "Teilweise": '<font color="#ca8a04"><b>Teilweise</b></font>',
        "Fehlt": '<font color="#dc2626"><b>Fehlt</b></font>',
        "Ja": '<font color="#16a34a"><b>Ja</b></font>',
        "Nein": '<font color="#dc2626"><b>Nein</b></font>',
    }
    for k, v in mapping.items():
        text = text.replace(k, v)
    return text


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontSize=28,
            leading=34,
            textColor=MSQDX_DARK,
            spaceAfter=12,
            alignment=TA_LEFT,
        ),
        "cover_sub": ParagraphStyle(
            "CoverSub",
            parent=base["Normal"],
            fontSize=14,
            leading=20,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=18,
            leading=22,
            textColor=MSQDX_DARK,
            spaceBefore=16,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=13,
            leading=16,
            textColor=MSQDX_ACCENT,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h2_checkion": ParagraphStyle(
            "H2C",
            parent=base["Heading2"],
            fontSize=13,
            leading=16,
            textColor=CHECKION,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h2_plexon": ParagraphStyle(
            "H2P",
            parent=base["Heading2"],
            fontSize=13,
            leading=16,
            textColor=PLEXON,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h2_audion": ParagraphStyle(
            "H2A",
            parent=base["Heading2"],
            fontSize=13,
            leading=16,
            textColor=AUDION,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=9.5,
            leading=13,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=9.5,
            leading=12,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=3,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#6b7280"),
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontSize=7,
            textColor=colors.HexColor("#9ca3af"),
        ),
    }
    return styles


def table(data, col_widths=None, header=True):
    wrapped = []
    for ri, row in enumerate(data):
        wrapped.append([Paragraph(status_cell(str(c)), styles["body"]) for c in row])
    t = Table(wrapped, colWidths=col_widths, repeatRows=1 if header else 0)
    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]
    if header:
        style_cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), MSQDX_LIGHT),
            ("TEXTCOLOR", (0, 0), (-1, 0), MSQDX_DARK),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(style_cmds))
    return t


def section_banner(title: str, color, subtitle: str = ""):
    items = [
        Spacer(1, 4 * mm),
        Table(
            [[Paragraph(f'<b><font size="14" color="#ffffff">{title}</font></b>', styles["body"])]],
            colWidths=[17 * cm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), color),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            ),
        ),
    ]
    if subtitle:
        items.append(Spacer(1, 2 * mm))
        items.append(Paragraph(subtitle, styles["body"]))
    items.append(Spacer(1, 4 * mm))
    return items


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#9ca3af"))
    canvas.drawString(2 * cm, 1.2 * cm, "MSQDX · Exyte SEO Tooling Gap-Analyse · Vertraulich")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Seite {doc.page}")
    if doc.page > 1:
        canvas.setStrokeColor(colors.HexColor("#e5e7eb"))
        canvas.line(2 * cm, A4[1] - 1.5 * cm, A4[0] - 2 * cm, A4[1] - 1.5 * cm)
    canvas.restoreState()


styles = build_styles()
story: list = []

# --- Cover ---
story.append(Spacer(1, 2 * cm))
story.append(Paragraph("Exyte SEO Brief", styles["cover_title"]))
story.append(Paragraph("Abgleich mit MSQDX Tooling", styles["cover_title"]))
story.append(Spacer(1, 0.5 * cm))
story.append(
    Paragraph(
        "PLEXON · CHECKION · AUDION",
        ParagraphStyle("tag", parent=styles["cover_sub"], fontSize=16, textColor=MSQDX_ACCENT),
    )
)
story.append(Spacer(1, 1 * cm))
story.append(HRFlowable(width="100%", thickness=2, color=MSQDX_ACCENT))
story.append(Spacer(1, 0.8 * cm))
meta = [
    ["Quelle:", "SEO Agency Brief, Exyte, 20. April 2026"],
    ["Stand:", date.today().strftime("%d. %B %Y")],
    ["Ziel:", "Prüfung der Tool-Abdeckung gegenüber Exyte-Erwartungen"],
]
story.append(table([["", ""]] + meta, col_widths=[3.5 * cm, 13 * cm], header=False))
story.append(Spacer(1, 2 * cm))
story.append(
    Paragraph(
        "<b>Kernaussage:</b> CHECKION deckt technisches und on-page SEO sowie Monitoring "
        "substanziell ab. Strategie, Sitecore, GSC/GA/GTM und redaktionelles SEO-Playbook "
        "erfordern Agency, Prozess und ggf. Produkt-Roadmap.",
        styles["body"],
    )
)
story.append(PageBreak())

# --- Executive Summary ---
story.append(Paragraph("1. Executive Summary", styles["h1"]))
story.append(
    table(
        [
            ["Dimension", "Bewertung"],
            ["Technisches SEO", "CHECKION: Domain-Scan, Canonical, Redirects, PageSpeed, SSL"],
            ["Content-SEO & Keywords", "Teilweise: On-Page, AI-Suggest, Rank-Tracking (Serper)"],
            ["GEO / AI-Sichtbarkeit", "Stark in CHECKION (über klassisches SEO-Briefing hinaus)"],
            ["Reporting & Reifegrad", "Lücken: kein GSC/GA4/GTM, kein Standard-Reporting-Template"],
            ["CMS / Sitecore", "Nicht abgedeckt — Agency + Playbook nötig"],
            ["PLEXON", "Orchestrierung & Governance — kein SEO-Tool"],
            ["AUDION", "Personas & Journeys — SEO nur via CHECKION Site Topics"],
        ],
        col_widths=[5 * cm, 12 * cm],
    )
)
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("2. Exyte-Anforderungen (Kurzüberblick)", styles["h1"]))
story.append(Paragraph("2.1 Ausgangslage", styles["h2"]))
for b in [
    "SEO fragmentiert — „Content first, SEO later“",
    "Kein SEO-Playbook im Editorial-Prozess",
    "Inkonsistente Editor-Praktiken",
    "Keine Strategie, Benchmarks, Reporting-Cadence",
    "Begrenztes technisches SEO-Know-how im Team",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("2.2 Erwartungen an die Agency", styles["h2"]))
story.append(
    table(
        [
            ["Erwartung", "MSQDX-Abdeckung"],
            ["Umfassender SEO-Audit (page + technical)", "CHECKION: Hoch"],
            ["GSC, GTM, GA, Page Speed Fehler", "Page Speed: Ja · GSC/GTM/GA: Nein"],
            ["Keyword Research & Priorisierung", "CHECKION: Mittel"],
            ["Reporting-Framework intern", "CHECKION: Teilweise"],
            ["Sitecore-native Partner", "Nicht abgedeckt"],
            ["Enablement & Playbook", "Prozess / Dokumentation"],
        ],
        col_widths=[8 * cm, 9 * cm],
    )
)
story.append(PageBreak())

# --- CHECKION ---
story.extend(
    section_banner(
        "CHECKION",
        CHECKION,
        "Primäres SEO-, GEO- und Qualitäts-Instrument · Website-Audits, Rankings, Projekte",
    )
)
story.append(Paragraph("3. CHECKION — Rolle & Positionierung", styles["h1"]))
story.append(
    Paragraph(
        "CHECKION ist die zentrale Antwort auf den Exyte-Brief im Bereich Diagnose und Monitoring. "
        "Die Plattform misst technisches SEO, On-Page-Signale, Performance, Accessibility und "
        "optional GEO/AI-Sichtbarkeit — kontinuierlich projektbasiert, nicht als Einmal-Checkliste.",
        styles["body"],
    )
)
story.append(Paragraph("3.1 Scan-Modi & Exyte-Nutzen", styles["h2_checkion"]))
story.append(
    table(
        [
            ["Modus", "Funktion", "Exyte-Nutzen"],
            ["Single-Page Scan", "WCAG, SEO, GEO, UX pro URL", "Landingpages, Pre-Launch"],
            ["Domain Deep Scan", "Crawl, Rollups, Link-Graph", "Kern des technischen Audits"],
            ["GEO / E-E-A-T intensiv", "LLM-Analyse, Wettbewerb", "AI-Search-Positionierung"],
            ["UX Journey Agent", "Browser-Automation", "User Flows (nicht klassisches SEO)"],
        ],
        col_widths=[4 * cm, 6.5 * cm, 6.5 * cm],
    )
)
story.append(Paragraph("3.2 Abgleich Exyte-Anforderungen", styles["h2_checkion"]))
story.append(
    table(
        [
            ["Anforderung", "CHECKION-Funktion", "Status"],
            ["Page-level SEO Audit", "Title, Meta, H1, OG, Schema", "Hoch"],
            ["Technical SEO Audit", "Crawl, Canonical, Redirects, Links", "Hoch"],
            ["Page Speed", "Lab-Metriken + PageSpeed Insights", "Hoch"],
            ["Google Search Console", "—", "Fehlt"],
            ["Google Analytics / GTM", "—", "Fehlt"],
            ["Keyword Research", "AI-Suggest, Rank Tracking, On-Page", "Mittel"],
            ["Rankings / SERP", "Serper, Multi-Market, Wettbewerb", "Hoch"],
            ["Content-SEO", "Keyword-Dichte, Freshness, Klassifikation", "Hoch"],
            ["Wettbewerb", "Competitor Scans, Page Topics, GEO Benchmark", "Hoch"],
            ["Reporting Cadence", "PDF, Share, Projekt-Views", "Mittel"],
            ["Sitecore / CMS", "—", "Fehlt"],
            ["Automatisierung", "MCP (40+ Tools), PLEXON Board", "Hoch"],
        ],
        col_widths=[5 * cm, 7 * cm, 2.5 * cm],
    )
)
story.append(Paragraph("3.3 Technisches SEO (CHECKION)", styles["h2_checkion"]))
for b in [
    "Domain Crawl, Sitemap, robots.txt",
    "Canonical, hreflang, Duplicate-URLs",
    "Redirect chains, Broken Links (intern/extern)",
    "Indexability, Security Headers, HTTPS",
    "SSL Labs & PageSpeed Insights (Standalone-Tools)",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("3.4 Content & On-Page SEO", styles["h2_checkion"]))
for b in [
    "Title, Meta, H1, Heading-Struktur, OG/Twitter",
    "Structured Data Gaps, Keyword-Analyse (DE/EN)",
    "SEO On-Page Score (Projekt), Content Freshness",
    "Page Classification & Page Topics Compare",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("3.5 Messung & Wettbewerb", styles["h2_checkion"]))
for b in [
    "Rank Tracking (Serper, Top ~100, Multi-Market)",
    "Competitor SERP-Positionen, Intent-Vergleich",
    "Project Research Agent (Keywords, GEO-Queries)",
    "Domain vs. Competitor Summaries",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("3.6 CHECKION — Lücken vs. Exyte-Brief", styles["h2_checkion"]))
for b in [
    "Keine GSC / GA4 / GTM-Integration (P0)",
    "Kein Sitecore-Bezug (P0)",
    "Kein SEO-Playbook / Pre-Publish in CMS (P0)",
    "Rank-Tracking nicht in MCP",
    "Kein Keyword-Volume-Tool (Ahrefs/Semrush-Niveau)",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(PageBreak())

# --- PLEXON ---
story.extend(
    section_banner(
        "PLEXON",
        PLEXON,
        "MSQDX Plattform-Hub · Identity, Projekte, Usage, Federation — kein natives SEO",
    )
)
story.append(Paragraph("4. PLEXON — Rolle & Positionierung", styles["h1"]))
story.append(
    Paragraph(
        "PLEXON ist die Steuerungsebene des Ökosystems: zentrale Anmeldung, Organisationen, "
        "Platform Projects, Nutzungs- und Token-Abrechnung sowie der Produkt-Katalog mit "
        "Deep-Links zu CHECKION und AUDION. SEO-Audits werden hier nicht ausgeführt, sondern "
        "orchestriert und governance-seitig abgebildet.",
        styles["body"],
    )
)
story.append(Paragraph("4.1 Kernfunktionen", styles["h2_plexon"]))
story.append(
    table(
        [
            ["Bereich", "Funktion", "Exyte-Relevanz"],
            ["Auth & Profile", "Login, Register, API-Tokens, PLEXON-Auth für Produkte", "Team-Zugang"],
            ["Platform Projects", "Zentrale Projekte, Sync zu CHECKION/AUDION", "Exyte + Exentec getrennt"],
            ["Produkt-Hub", "Launch CHECKION Scan, AUDION Personas", "Einstieg ohne Tool-Wechsel"],
            ["Usage / Tokens", "Abrechnung Scans, SERP, GEO", "Kostensteuerung"],
            ["Admin", "Orgs, Entitlements, User-Provisioning", "Rollen & Mandanten"],
            ["Board", "Claude + CHECKION/AUDION MCP", "Power-User-Automation"],
            ["Insights", "Scan- & Persona-Counts pro Projekt", "Aggregat, keine SEO-KPIs"],
        ],
        col_widths=[4 * cm, 7.5 * cm, 5.5 * cm],
    )
)
story.append(Paragraph("4.2 Abgleich Exyte-Anforderungen", styles["h2_plexon"]))
story.append(
    table(
        [
            ["Anforderung", "PLEXON", "Status"],
            ["Zentrale Identität / Teams", "Auth, Orgs, Entitlements", "Ja"],
            ["SEO-Audit", "—", "Nein"],
            ["Projekt-Insights", "Scan/Persona-Counts", "Teilweise"],
            ["Tool-Orchestrierung", "Board + MCP", "Ja"],
            ["Usage-Governance", "Token-Billing", "Ja"],
            ["SEO-Playbook", "—", "Nein"],
            ["Reporting SEO-KPIs", "—", "Nein"],
        ],
        col_widths=[5.5 * cm, 6.5 * cm, 2.5 * cm],
    )
)
story.append(Paragraph("4.3 Empfohlene Nutzung im Exyte-Setup", styles["h2_plexon"]))
for b in [
    "Platform Project „Exyte“ und „Exentec“ anlegen",
    "CHECKION- und optional AUDION-Projekt spiegeln (Provisioning)",
    "Entitlements für Marketing, IT, Redaktion steuern",
    "Board + MCP für wiederkehrende Audit-Automation (technisches Team)",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(PageBreak())

# --- AUDION ---
story.extend(
    section_banner(
        "AUDION",
        AUDION,
        "Persona Intelligence Platform · Research, Chat, Journeys — kein SEO-Tool",
    )
)
story.append(Paragraph("5. AUDION — Rolle & Positionierung", styles["h1"]))
story.append(
    Paragraph(
        "AUDION verwandelt Research in KI-Personas und Customer Journeys für Validierung von "
        "Produkt, UX und Messaging. Es ersetzt weder technisches SEO noch Sitecore-Redaktion, "
        "ergänzt aber die content-strategische Seite des Exyte-Briefs, wenn Themen und "
        "Zielgruppen aus dem Web-Kontext kommen sollen.",
        styles["body"],
    )
)
story.append(Paragraph("5.1 Kernfunktionen", styles["h2_audion"]))
story.append(
    table(
        [
            ["Bereich", "Funktion", "Exyte-Relevanz"],
            ["Target Groups", "Segmente, Knowledge, Dokumente", "Zielgruppen-Modell"],
            ["Personas", "KI-generiert, Chat, Moodboards", "Message-Validierung"],
            ["Journeys", "Phasen, AI-Generierung, Validierung", "Content-Journey, nicht SEO"],
            ["Research", "Upload, Ingestion, RAG", "Qualitative Insights"],
            ["CHECKION-Link", "Site Topics aus Scans", "Themen aus Website"],
            ["UX Journey Agent", "Browser als Persona", "UX-Audit, nicht SEO"],
            ["Plugins", "Figma, PowerPoint", "Stakeholder-Kommunikation"],
        ],
        col_widths=[4 * cm, 7 * cm, 6 * cm],
    )
)
story.append(Paragraph("5.2 Abgleich Exyte-Anforderungen", styles["h2_audion"]))
story.append(
    table(
        [
            ["Anforderung", "AUDION", "Status"],
            ["SEO-getriebene Content-Erstellung", "Personas, Chat, Journeys", "Teilweise"],
            ["Keyword-/Themen-Input", "CHECKION Site Topics", "Teilweise"],
            ["Technisches SEO", "—", "Nein"],
            ["GA4 für Journeys", "Stub/TODO", "Nein"],
            ["Browser-Validierung", "UX Journey Agent", "Ja (UX)"],
            ["SEO-Reporting", "—", "Nein"],
        ],
        col_widths=[5.5 * cm, 6 * cm, 2.5 * cm],
    )
)
story.append(Paragraph("5.3 CHECKION-Integration", styles["h2_audion"]))
story.append(
    Paragraph(
        "Mit verknüpftem CHECKION-Projekt (<i>checkion_project_id</i>) aggregiert AUDION "
        "Site Topics aus Domain-Scans (Tags, Gewichtung, Seitenanzahl) für Persona- und "
        "Target-Group-Vorschläge. Ohne CHECKION bleiben Themen manuell oder research-basiert.",
        styles["body"],
    )
)
story.append(Paragraph("5.4 Empfohlene Nutzung im Exyte-Setup", styles["h2_audion"]))
for b in [
    "Optional Phase B: Personas aus CHECKION Site Topics + Workshop-Research",
    "Journey-Maps für kritische Funnels (nicht Meta-Tag-Optimierung)",
    "Chat mit Personas zur Message-Validierung vor Redaktion",
    "Nicht als Ersatz für SEO-Agency oder GSC-Reporting einsetzen",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(PageBreak())

# --- Matrix & Vorgehen ---
story.append(Paragraph("6. Gesamt-Matrix: Brief → Tools", styles["h1"]))
story.append(
    table(
        [
            ["Brief-Thema", "CHECKION", "PLEXON", "AUDION", "Agency"],
            ["Technischer SEO-Audit", "Ja", "—", "—", "Sitecore"],
            ["Page-level SEO", "Ja", "—", "—", "—"],
            ["GSC / GA / GTM", "Nein", "Nein", "Nein", "Ja"],
            ["Page Speed", "Ja", "—", "—", "—"],
            ["Keyword-Strategie", "Teilw.", "—", "Teilw.", "Ja"],
            ["SEO-Playbook", "Nein", "Nein", "Nein", "Ja"],
            ["Sitecore", "Nein", "Nein", "Nein", "Ja"],
            ["GEO / AI-Sichtbarkeit", "Ja", "—", "—", "Optional"],
        ],
        col_widths=[4.2 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 2.8 * cm],
    )
)
story.append(Spacer(1, 8 * mm))
story.append(Paragraph("7. Priorisierte Lücken (P0)", styles["h1"]))
for i, b in enumerate(
    [
        "Keine GSC / GA / GTM-Integration",
        "Kein Sitecore-Bezug (Brief-Pflicht)",
        "Kein SEO-Playbook / redaktionelle Guardrails",
        "Kein standardisiertes Impact-Reporting-Template",
    ],
    1,
):
    story.append(Paragraph(f"{i}. {b}", styles["bullet"]))
story.append(Paragraph("8. Empfohlenes Vorgehen", styles["h1"]))
story.append(Paragraph("Phase A — Diagnose (CHECKION)", styles["h2"]))
for b in [
    "Platform Project in PLEXON; Domain Deep Scan pro Website",
    "Single-Page-Scans für Top-Landingpages",
    "Rank Tracking mit initialen Keywords (AI + Workshop)",
    "Optional GEO/E-E-A-T Scan",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("Phase B — Strategie (Agency + MSQDX)", styles["h2"]))
for b in [
    "Agency: Reifegrad, Roadmap, Sitecore-Felder, Playbook",
    "MSQDX: CHECKION-Dashboards, Share-Links, MCP",
    "AUDION optional: Personas/Journeys für Content-Richtung",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Paragraph("Phase C — Betrieb (intern)", styles["h2"]))
for b in [
    "Monatlich/quartalsweise: Rank-Refresh, Re-Scan, PageSpeed",
    "Hybrid-Reporting: GSC-Export manuell + CHECKION bis Integration",
]:
    story.append(Paragraph(f"• {b}", styles["bullet"]))
story.append(Spacer(1, 8 * mm))
story.append(Paragraph("9. Leistungsangebot — Kurz", styles["h1"]))
story.append(
    table(
        [
            ["Leistung", "MSQDX"],
            ["Technisches & On-Page SEO-Audit", "Ja (CHECKION)"],
            ["Performance, SSL, Sicherheit", "Ja (CHECKION)"],
            ["Keyword-Monitoring & Wettbewerb", "Ja (CHECKION)"],
            ["AI/GEO-Sichtbarkeit", "Ja (CHECKION)"],
            ["Persona- & Journey-Validierung", "Ja (AUDION)"],
            ["Zentrale Plattform & Teams", "Ja (PLEXON)"],
            ["GSC/GA/GTM, Sitecore, Playbook", "Nein / Agency"],
        ],
        col_widths=[10 * cm, 7 * cm],
    )
)
story.append(Spacer(1, 1 * cm))
story.append(
    Paragraph(
        "<i>Internes Dokument · Gesprächsgrundlage · Keine vertragliche Leistungszusage.</i>",
        styles["small"],
    )
)

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=2 * cm,
    rightMargin=2 * cm,
    topMargin=2 * cm,
    bottomMargin=2 * cm,
    title="Exyte SEO Tooling Gap-Analyse",
    author="MSQDX",
)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF written: {OUT}")
