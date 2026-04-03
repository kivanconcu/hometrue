"""
PDF report generation using ReportLab.
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import date
from typing import Any, Dict


# Colors
NAVY = colors.HexColor("#0f172a")
GREEN = colors.HexColor("#22c55e")
YELLOW = colors.HexColor("#eab308")
RED = colors.HexColor("#ef4444")
LIGHT_GRAY = colors.HexColor("#f1f5f9")
MID_GRAY = colors.HexColor("#94a3b8")
WHITE = colors.white


def _score_color(score: int):
    if score <= 30:
        return GREEN
    elif score <= 60:
        return YELLOW
    return RED


def _flag_color(flag_type: str):
    return RED if flag_type == "red" else GREEN


def generate_pdf(data: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Normal"],
                                  fontSize=24, textColor=WHITE,
                                  fontName="Helvetica-Bold", alignment=TA_LEFT)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"],
                                     fontSize=11, textColor=MID_GRAY, alignment=TA_LEFT)
    section_style = ParagraphStyle("Section", parent=styles["Normal"],
                                    fontSize=14, textColor=NAVY,
                                    fontName="Helvetica-Bold", spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                 fontSize=10, textColor=NAVY, leading=14)
    small_style = ParagraphStyle("Small", parent=styles["Normal"],
                                  fontSize=8, textColor=MID_GRAY)
    flag_red = ParagraphStyle("FlagRed", parent=styles["Normal"],
                               fontSize=9, textColor=RED, leading=13)
    flag_green = ParagraphStyle("FlagGreen", parent=styles["Normal"],
                                 fontSize=9, textColor=colors.HexColor("#16a34a"), leading=13)

    prop = data.get("property", {})
    score_data = data.get("valuation_score", {})
    comps = data.get("comps", [])
    neighborhood = data.get("neighborhood", {})
    trends = data.get("trends", {})
    flags = data.get("flags", [])

    score = score_data.get("score", 0)
    score_label = score_data.get("label", "N/A")
    score_col = _score_color(score)

    story = []

    # ── Header banner ──────────────────────────────────────────────
    header_data = [
        [Paragraph("<b>HomeTrue</b> — Full Valuation Report", title_style)],
        [Paragraph(f"{prop.get('address', '')}  ·  {prop.get('city', '')}, {prop.get('state', '')} {prop.get('zip_code', '')}", subtitle_style)],
        [Paragraph(f"Generated {date.today().strftime('%B %d, %Y')}", subtitle_style)],
    ]
    header_table = Table(header_data, colWidths=[7 * inch])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [NAVY]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Property Details ───────────────────────────────────────────
    story.append(Paragraph("Property Details", section_style))
    asking = prop.get("asking_price")
    prop_rows = [
        ["Address", prop.get("address", "N/A")],
        ["City / State / ZIP", f"{prop.get('city', '')}, {prop.get('state', '')} {prop.get('zip_code', '')}"],
        ["Asking Price", f"${asking:,.0f}" if asking else "N/A"],
        ["Bedrooms / Bathrooms", f"{prop.get('bedrooms', 'N/A')} bd / {prop.get('bathrooms', 'N/A')} ba"],
        ["Square Footage", f"{prop.get('sqft', 'N/A'):,}" if prop.get('sqft') else "N/A"],
        ["Year Built", str(prop.get("year_built", "N/A"))],
        ["Days on Market", str(prop.get("days_on_market", "N/A"))],
        ["Price Reductions", str(prop.get("price_reductions", 0))],
    ]
    prop_table = Table(prop_rows, colWidths=[2 * inch, 5 * inch])
    prop_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("TEXTCOLOR", (0, 0), (0, -1), MID_GRAY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(prop_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Overvaluation Score ────────────────────────────────────────
    story.append(Paragraph("Overvaluation Score", section_style))
    score_rows = [
        [Paragraph(f"<b>{score}/100</b>", ParagraphStyle("sc", fontSize=22, textColor=score_col, fontName="Helvetica-Bold")),
         Paragraph(f"<b>{score_label}</b>", ParagraphStyle("sl", fontSize=14, textColor=score_col))],
    ]
    score_table = Table(score_rows, colWidths=[1.5 * inch, 5.5 * inch])
    score_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
    ]))
    story.append(score_table)

    # Breakdown
    bd = score_data.get("breakdown", {})
    bd_rows = [
        ["Component", "Score", "Weight"],
        ["$/sqft vs Comps", f"{bd.get('psqft_score', 0):.0f}", "40%"],
        ["Days on Market", f"{bd.get('dom_score', 0):.0f}", "20%"],
        ["Price-to-Rent Ratio", f"{bd.get('ptr_score', 0):.0f}", "20%"],
        ["Price Reductions", f"{bd.get('price_reduction_score', 0):.0f}", "10%"],
        ["Tax Assessed Gap", f"{bd.get('tax_gap_score', 0):.0f}", "10%"],
    ]
    bd_table = Table(bd_rows, colWidths=[3.5 * inch, 1.5 * inch, 2 * inch])
    bd_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
    ]))
    story.append(Spacer(1, 0.1 * inch))
    story.append(bd_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Key Metrics ────────────────────────────────────────────────
    story.append(Paragraph("Key Metrics", section_style))
    ptr = data.get("price_to_rent_ratio", 0)
    ptr_bench = data.get("ptr_benchmark", "N/A")
    metrics_rows = [
        ["Metric", "Value", "Benchmark"],
        ["Subject $/sqft", f"${data.get('subject_price_per_sqft', 0) or 0:.0f}", "—"],
        ["Median Comp $/sqft", f"${data.get('median_comp_price_per_sqft', 0):.0f}", "—"],
        ["Avg Comp $/sqft", f"${data.get('avg_comp_price_per_sqft', 0):.0f}", "—"],
        ["Monthly Rent Estimate", f"${data.get('monthly_rent_estimate', 0):,.0f}", "—"],
        ["Price-to-Rent Ratio", f"{ptr:.1f}", "<15 buy · 15–20 neutral · >20 rent"],
        ["P/R Signal", ptr_bench.upper(), "—"],
        ["Days on Market", str(prop.get("days_on_market", "N/A")), f"Zip avg: {data.get('dom_zip_average', 0):.0f} days"],
    ]
    metrics_table = Table(metrics_rows, colWidths=[2.5 * inch, 1.75 * inch, 2.75 * inch])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Comparable Sales ───────────────────────────────────────────
    story.append(Paragraph("Comparable Sales (CMA)", section_style))
    comp_rows = [["Address", "Sold Price", "Sqft", "$/sqft", "Sold Date", "Bed/Bath"]]
    for c in comps[:8]:
        comp_rows.append([
            c.get("address", "")[:35],
            f"${c.get('sold_price', 0):,.0f}",
            f"{c.get('sqft', 0):,}",
            f"${c.get('price_per_sqft', 0):.0f}",
            c.get("sold_date", ""),
            f"{c.get('bedrooms', 0)}bd/{c.get('bathrooms', 0)}ba",
        ])
    comp_table = Table(comp_rows, colWidths=[2.1*inch, 1.0*inch, 0.6*inch, 0.7*inch, 0.85*inch, 0.75*inch])
    comp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Neighborhood ──────────────────────────────────────────────
    story.append(Paragraph("Neighborhood Signals", section_style))
    nb = neighborhood
    nb_rows = [
        ["Median Household Income", f"${nb.get('median_income', 0):,.0f}" if nb.get('median_income') else "N/A"],
        ["Population", f"{nb.get('population', 0):,}" if nb.get('population') else "N/A"],
        ["Owner-Occupied", f"{nb.get('owner_occupied_pct', 0):.1f}%" if nb.get('owner_occupied_pct') else "N/A"],
        ["Renter-Occupied", f"{nb.get('renter_occupied_pct', 0):.1f}%" if nb.get('renter_occupied_pct') else "N/A"],
        ["Affordability Stress", "Yes — income-to-price ratio elevated" if nb.get('income_affordability_stress') else "No"],
        ["Data Source", nb.get("data_source", "U.S. Census Bureau ACS 5-Year")],
    ]
    nb_table = Table(nb_rows, colWidths=[2.5 * inch, 4.5 * inch])
    nb_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("TEXTCOLOR", (0, 0), (0, -1), MID_GRAY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(nb_table)
    story.append(Spacer(1, 0.2 * inch))

    # ── Flags ─────────────────────────────────────────────────────
    story.append(Paragraph("Red & Green Flags", section_style))
    red_flags = [f for f in flags if f.get("type") == "red"]
    green_flags = [f for f in flags if f.get("type") == "green"]

    if red_flags:
        story.append(Paragraph("<b>Red Flags</b>", body_style))
        for f in red_flags:
            story.append(Paragraph(f"  ▲  {f['message']}", flag_red))
    if green_flags:
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph("<b>Green Flags</b>", body_style))
        for f in green_flags:
            story.append(Paragraph(f"  ✔  {f['message']}", flag_green))
    story.append(Spacer(1, 0.2 * inch))

    # ── Price Projections ─────────────────────────────────────────
    projected_values = trends.get("projected_values", [])
    if projected_values:
        story.append(Paragraph("Price Projections (FHFA HPI Linear Regression)", section_style))
        proj_rows = [["Horizon", "Projected Value", "Low Estimate", "High Estimate"]]
        for pv in projected_values:
            proj_rows.append([
                f"{pv.get('years_out', 0)} Year{'s' if pv.get('years_out', 0) > 1 else ''}",
                f"${pv.get('estimated_value', 0):,.0f}",
                f"${pv.get('lower_value', 0):,.0f}",
                f"${pv.get('upper_value', 0):,.0f}",
            ])
        proj_table = Table(proj_rows, colWidths=[1.5*inch, 2*inch, 1.75*inch, 1.75*inch])
        proj_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
        ]))
        story.append(proj_table)
        story.append(Spacer(1, 0.1 * inch))
        story.append(Paragraph(
            "⚠ Disclaimer: Projections are estimates based on historical FHFA HPI trends and are not guarantees of future value. "
            "Actual results may differ significantly due to market conditions, interest rates, and local factors.",
            small_style,
        ))

    # ── Footer ────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY))
    story.append(Spacer(1, 0.05 * inch))
    story.append(Paragraph(
        "HomeTrue Valuation Report  ·  For informational purposes only  ·  Not financial or legal advice",
        small_style,
    ))
    if data.get("is_mock"):
        story.append(Paragraph(
            "⚠ NOTICE: Some or all data in this report is simulated mock data due to API unavailability.",
            ParagraphStyle("warn", parent=small_style, textColor=RED),
        ))

    doc.build(story)
    return buffer.getvalue()
