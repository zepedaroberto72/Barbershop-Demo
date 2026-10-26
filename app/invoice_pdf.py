"""Render an invoice PDF that mirrors the on-screen Barber Shop sheet."""

from __future__ import annotations

import re
from io import BytesIO
from typing import Any, Optional

from fpdf import FPDF

from app.invoice_share import compute_totals, line_amount, money, split_lines


_UNICODE_ASCII = str.maketrans(
    {
        "\u2014": "-",  # em dash
        "\u2013": "-",  # en dash
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "*",
        "\u00b7": "-",  # middle dot
    }
)


def _safe(value: Any) -> str:
    """Helvetica core fonts are Latin-1; normalize common punctuation first."""
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u2026", "...")
    text = text.translate(_UNICODE_ASCII)
    return text.encode("latin-1", "replace").decode("latin-1")


def invoice_pdf_filename(invoice_number: str = "") -> str:
    raw = (invoice_number or "").strip() or "invoice"
    safe = re.sub(r"[^\w.\-]+", "_", raw).strip("._") or "invoice"
    if not safe.lower().endswith(".pdf"):
        safe = f"{safe}.pdf"
    return safe


def build_invoice_pdf(
    *,
    business_name: str = "Barber Shop",
    business_sub: str = "Appliance service · Central Valley",
    invoice_number: str = "",
    invoice_date: str = "",
    customer_name: str = "",
    customer_phone: str = "",
    customer_email: str = "",
    customer_address: str = "",
    job_summary: str = "",
    technician_name: str = "",
    lines: Optional[list[dict[str, Any]]] = None,
    tax_rate: float = 8.25,
    notes: str = "",
    language: str = "en",
) -> bytes:
    """Return PDF bytes for the current invoice document."""
    lang = "es" if (language or "").strip().lower().startswith("es") else "en"
    brand = _safe((business_name or "").strip() or "Barber Shop")
    lines = lines or []
    service, materials = split_lines(lines)
    service_sub, materials_sub, subtotal, tax, total = compute_totals(lines, tax_rate)
    inv = _safe((invoice_number or "").strip() or "-")
    inv_date = _safe((invoice_date or "").strip())

    if lang == "es":
        labels = {
            "title": "Factura",
            "bill_to": "Facturar a",
            "job": "Trabajo",
            "tech": "Técnico",
            "service": "Servicio",
            "materials": "Materiales",
            "desc": "Descripción",
            "unit_price": "Precio unit.",
            "hours": "Horas",
            "price": "Precio",
            "quantity": "Cant.",
            "line_total": "Total",
            "sub_service": "Subtotal servicio",
            "sub_materials": "Subtotal materiales",
            "subtotal": "Subtotal",
            "tax": "Impuesto",
            "total": "Total",
            "notes": "Notas",
            "sub": business_sub or "Servicio de electrodomésticos · Central Valley",
        }
    else:
        labels = {
            "title": "Invoice",
            "bill_to": "Bill to",
            "job": "Job",
            "tech": "Tech",
            "service": "Service",
            "materials": "Materials",
            "desc": "Description",
            "unit_price": "Unit price",
            "hours": "Hours",
            "price": "Price",
            "quantity": "Qty",
            "line_total": "Total",
            "sub_service": "Service subtotal",
            "sub_materials": "Materials subtotal",
            "subtotal": "Subtotal",
            "tax": "Tax",
            "total": "Total",
            "notes": "Notes",
            "sub": business_sub or "Appliance service · Central Valley",
        }

    pdf = FPDF(orientation="P", unit="mm", format="Letter")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 16, 18)

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 8, brand, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, _safe(labels["sub"]), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    meta_x = 130
    y0 = 16
    pdf.set_xy(meta_x, y0)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(62, 6, _safe(labels["title"]), new_x="LMARGIN", new_y="NEXT", align="R")
    pdf.set_x(meta_x)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(62, 5, inv, new_x="LMARGIN", new_y="NEXT", align="R")
    if inv_date:
        pdf.set_x(meta_x)
        pdf.cell(62, 5, inv_date, new_x="LMARGIN", new_y="NEXT", align="R")

    pdf.ln(8)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(18, pdf.get_y(), 198, pdf.get_y())
    pdf.ln(6)

    # Bill to + Job
    col_w = 88
    left_x = 18
    right_x = 110
    block_y = pdf.get_y()

    def _party_block(x: float, y: float, title: str, rows: list[str]) -> float:
        pdf.set_xy(x, y)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(110, 110, 110)
        pdf.cell(col_w, 5, _safe(title).upper(), new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 10)
        for row in rows:
            text = _safe(row).strip()
            if not text:
                continue
            pdf.set_x(x)
            pdf.multi_cell(col_w, 5, text)
        return pdf.get_y()

    bill_rows = [
        customer_name or "-",
        customer_phone,
        customer_email,
        customer_address,
    ]
    job_rows = [
        job_summary or "-",
        f"{labels['tech']}: {technician_name}" if (technician_name or "").strip() else "",
    ]
    y_left = _party_block(left_x, block_y, labels["bill_to"], bill_rows)
    y_right = _party_block(right_x, block_y, labels["job"], job_rows)
    pdf.set_y(max(y_left, y_right) + 6)

    def _section(
        title: str,
        section_lines: list[dict[str, Any]],
        mid_label: str,
        qty_label: str,
        sub_label: str,
        section_sub: float,
    ) -> None:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 7, _safe(title), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(78, 6, _safe(labels["desc"]), border=0, fill=True)
        pdf.cell(28, 6, _safe(mid_label), border=0, fill=True, align="R")
        pdf.cell(24, 6, _safe(qty_label), border=0, fill=True, align="R")
        pdf.cell(30, 6, _safe(labels["line_total"]), border=0, fill=True, align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        if not section_lines:
            pdf.cell(0, 6, "-", new_x="LMARGIN", new_y="NEXT")
        else:
            for line in section_lines:
                desc = _safe(line.get("description") or "-")
                qty = float(line.get("qty") or 0)
                rate = float(line.get("rate") or 0)
                amt = money(line_amount(line))
                y_before = pdf.get_y()
                pdf.multi_cell(78, 5, desc)
                y_after = pdf.get_y()
                row_h = max(6, y_after - y_before)
                pdf.set_xy(18 + 78, y_before)
                pdf.cell(28, row_h, _safe(money(rate)), align="R")
                pdf.cell(24, row_h, f"{qty:g}", align="R")
                pdf.cell(30, row_h, _safe(amt), align="R", new_x="LMARGIN", new_y="NEXT")
                pdf.set_y(y_before + row_h)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, f"{_safe(sub_label)}: {_safe(money(section_sub))}", align="R", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

    _section(
        labels["service"],
        service,
        labels["unit_price"],
        labels["hours"],
        labels["sub_service"],
        service_sub,
    )
    _section(
        labels["materials"],
        materials,
        labels["price"],
        labels["quantity"],
        labels["sub_materials"],
        materials_sub,
    )

    pdf.ln(2)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(120, pdf.get_y(), 198, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"{_safe(labels['subtotal'])}: {_safe(money(subtotal))}", align="R", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        6,
        f"{_safe(labels['tax'])} ({float(tax_rate):g}%): {_safe(money(tax))}",
        align="R",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"{_safe(labels['total'])}: {_safe(money(total))}", align="R", new_x="LMARGIN", new_y="NEXT")

    note = (notes or "").strip()
    if note:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(110, 110, 110)
        pdf.cell(0, 5, _safe(labels["notes"]).upper(), new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _safe(note))

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
