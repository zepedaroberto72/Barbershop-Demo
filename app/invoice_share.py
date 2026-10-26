"""Build invoice summaries and send via SMS (Twilio) or email (SendGrid)."""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from app.email import email_configured, is_valid_email, send_email
from app.sms import (
    create_and_confirm_sms,
    normalize_phone_e164,
    twilio_configured,
    twilio_error_detail,
)

logger = logging.getLogger(__name__)


def money(amount: float) -> str:
    return f"${float(amount or 0):.2f}"


def line_kind(line: dict[str, Any]) -> str:
    kind = str(line.get("kind") or "service").strip().lower()
    return "material" if kind == "material" else "service"


def line_amount(line: dict[str, Any]) -> float:
    return float(line.get("qty") or 0) * float(line.get("rate") or 0)


def split_lines(lines: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    service = [l for l in lines if line_kind(l) == "service"]
    materials = [l for l in lines if line_kind(l) == "material"]
    return service, materials


def compute_totals(lines: list[dict[str, Any]], tax_rate: float) -> tuple[float, float, float, float, float]:
    service, materials = split_lines(lines)
    service_sub = sum(line_amount(l) for l in service)
    materials_sub = sum(line_amount(l) for l in materials)
    subtotal = service_sub + materials_sub
    tax = subtotal * (float(tax_rate or 0) / 100.0)
    return service_sub, materials_sub, subtotal, tax, subtotal + tax


def build_invoice_summary(
    *,
    business_name: str = "Barber Shop",
    invoice_number: str = "",
    customer_name: str = "",
    job_summary: str = "",
    lines: Optional[list[dict[str, Any]]] = None,
    tax_rate: float = 8.25,
    notes: str = "",
    language: str = "en",
    for_sms: bool = False,
) -> str:
    """Plain-text invoice summary shared by SMS and email bodies."""
    lang = "es" if (language or "").strip().lower().startswith("es") else "en"
    brand = (business_name or "").strip() or os.getenv("BUSINESS_NAME", "Barber Shop").strip() or "Barber Shop"
    lines = lines or []
    service_sub, materials_sub, _subtotal, _tax, total = compute_totals(lines, tax_rate)
    inv = (invoice_number or "").strip() or "—"
    job = (job_summary or "").strip()
    name = (customer_name or "").strip()
    service, materials = split_lines(lines)

    if for_sms:
        if lang == "es":
            parts = [f"{brand}: Factura {inv}."]
            if job:
                parts.append(f"{job}.")
            parts.append(f"Servicio {money(service_sub)}, materiales {money(materials_sub)}.")
            parts.append(f"Total {money(total)}.")
            parts.append("Detalles a solicitud.")
            return " ".join(parts)
        parts = [f"{brand}: Invoice {inv}."]
        if job:
            parts.append(f"{job}.")
        parts.append(f"Service {money(service_sub)}, materials {money(materials_sub)}.")
        parts.append(f"Total {money(total)}.")
        parts.append("Details on request.")
        return " ".join(parts)

    def _section_lines(section_lines: list[dict[str, Any]], *, is_service: bool) -> list[str]:
        rows = []
        for line in section_lines:
            desc = str(line.get("description") or "").strip() or "—"
            qty = float(line.get("qty") or 0)
            rate = float(line.get("rate") or 0)
            amt = money(line_amount(line))
            if is_service:
                if lang == "es":
                    rows.append(f"• {desc} — {money(rate)} × {qty:g} h = {amt}")
                else:
                    rows.append(f"• {desc} — {money(rate)} × {qty:g} h = {amt}")
            else:
                if lang == "es":
                    rows.append(f"• {desc} — {money(rate)} × {qty:g} = {amt}")
                else:
                    rows.append(f"• {desc} — {money(rate)} × {qty:g} = {amt}")
        return rows

    if lang == "es":
        out = [f"{brand}", f"Factura {inv}", ""]
        if name:
            out.append(f"Cliente: {name}")
        if job:
            out.append(f"Trabajo: {job}")
        out.append("")
        out.append("Servicio (precio unitario × horas)")
        out.extend(_section_lines(service, is_service=True) or ["• —"])
        out.append(f"Subtotal servicio: {money(service_sub)}")
        out.append("")
        out.append("Materiales (precio × cantidad)")
        out.extend(_section_lines(materials, is_service=False) or ["• —"])
        out.append(f"Subtotal materiales: {money(materials_sub)}")
        out.append("")
        out.append(f"Subtotal: {money(_subtotal)}")
        out.append(f"Impuesto ({float(tax_rate):g}%): {money(_tax)}")
        out.append(f"Total: {money(total)}")
        if (notes or "").strip():
            out.extend(["", (notes or "").strip()])
        return "\n".join(out)

    out = [f"{brand}", f"Invoice {inv}", ""]
    if name:
        out.append(f"Customer: {name}")
    if job:
        out.append(f"Job: {job}")
    out.append("")
    out.append("Service (unit price × hours)")
    out.extend(_section_lines(service, is_service=True) or ["• —"])
    out.append(f"Service subtotal: {money(service_sub)}")
    out.append("")
    out.append("Materials (price × quantity)")
    out.extend(_section_lines(materials, is_service=False) or ["• —"])
    out.append(f"Materials subtotal: {money(materials_sub)}")
    out.append("")
    out.append(f"Subtotal: {money(_subtotal)}")
    out.append(f"Tax ({float(tax_rate):g}%): {money(_tax)}")
    out.append(f"Total: {money(total)}")
    if (notes or "").strip():
        out.extend(["", (notes or "").strip()])
    return "\n".join(out)


def build_invoice_html(
    *,
    business_name: str = "Barber Shop",
    invoice_number: str = "",
    customer_name: str = "",
    job_summary: str = "",
    lines: Optional[list[dict[str, Any]]] = None,
    tax_rate: float = 8.25,
    notes: str = "",
    language: str = "en",
) -> str:
    lang = "es" if (language or "").strip().lower().startswith("es") else "en"
    brand = (business_name or "").strip() or "Barber Shop"
    lines = lines or []
    service_sub, materials_sub, subtotal, tax, total = compute_totals(lines, tax_rate)
    service, materials = split_lines(lines)
    inv = (invoice_number or "").strip() or "—"

    if lang == "es":
        labels = {
            "title": "Factura",
            "bill_to": "Facturar a",
            "job": "Trabajo",
            "service": "Servicio",
            "materials": "Materiales",
            "desc": "Descripción",
            "unit_price": "Precio unitario",
            "hours": "Horas",
            "price": "Precio",
            "quantity": "Cantidad",
            "line_total": "Total",
            "sub_service": "Subtotal servicio",
            "sub_materials": "Subtotal materiales",
            "subtotal": "Subtotal",
            "tax": "Impuesto",
            "total": "Total",
            "notes": "Notas",
        }
    else:
        labels = {
            "title": "Invoice",
            "bill_to": "Bill to",
            "job": "Job",
            "service": "Service",
            "materials": "Materials",
            "desc": "Description",
            "unit_price": "Unit price",
            "hours": "Hours",
            "price": "Price",
            "quantity": "Quantity",
            "line_total": "Total",
            "sub_service": "Service subtotal",
            "sub_materials": "Materials subtotal",
            "subtotal": "Subtotal",
            "tax": "Tax",
            "total": "Total",
            "notes": "Notes",
        }

    def esc(s: str) -> str:
        return (
            str(s or "")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    def section_table(
        section_lines: list[dict[str, Any]],
        *,
        col_mid: str,
        col_qty: str,
    ) -> str:
        rows = []
        for line in section_lines:
            desc = esc(line.get("description") or "—")
            qty = float(line.get("qty") or 0)
            rate = float(line.get("rate") or 0)
            rows.append(
                f"<tr><td>{desc}</td>"
                f"<td style='text-align:right'>{esc(money(rate))}</td>"
                f"<td style='text-align:right'>{qty:g}</td>"
                f"<td style='text-align:right'>{esc(money(line_amount(line)))}</td></tr>"
            )
        body = "".join(rows) or '<tr><td colspan="4">—</td></tr>'
        return f"""<table style="width:100%;border-collapse:collapse;margin:8px 0 12px;" cellpadding="8">
    <thead>
      <tr style="border-bottom:2px solid #111;text-align:left;">
        <th>{esc(labels['desc'])}</th>
        <th style="text-align:right">{esc(col_mid)}</th>
        <th style="text-align:right">{esc(col_qty)}</th>
        <th style="text-align:right">{esc(labels['line_total'])}</th>
      </tr>
    </thead>
    <tbody>{body}</tbody>
  </table>"""

    notes_html = ""
    if (notes or "").strip():
        notes_html = (
            f"<p><strong>{esc(labels['notes'])}:</strong> {esc(notes.strip())}</p>"
        )

    return f"""<!DOCTYPE html>
<html><body style="font-family:Georgia,serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="margin:0 0 4px;font-size:28px;">{esc(brand)}</h1>
  <p style="margin:0 0 20px;color:#555;">{esc(labels['title'])} {esc(inv)}</p>
  <p><strong>{esc(labels['bill_to'])}:</strong> {esc(customer_name or "—")}</p>
  <p><strong>{esc(labels['job'])}:</strong> {esc(job_summary or "—")}</p>
  <h2 style="font-size:1.1em;margin:24px 0 4px;">{esc(labels['service'])}</h2>
  {section_table(service, col_mid=labels['unit_price'], col_qty=labels['hours'])}
  <p style="text-align:right;margin:0 0 16px;">{esc(labels['sub_service'])}: {esc(money(service_sub))}</p>
  <h2 style="font-size:1.1em;margin:8px 0 4px;">{esc(labels['materials'])}</h2>
  {section_table(materials, col_mid=labels['price'], col_qty=labels['quantity'])}
  <p style="text-align:right;margin:0 0 16px;">{esc(labels['sub_materials'])}: {esc(money(materials_sub))}</p>
  <p style="text-align:right;margin:4px 0;">{esc(labels['subtotal'])}: {esc(money(subtotal))}</p>
  <p style="text-align:right;margin:4px 0;">{esc(labels['tax'])} ({float(tax_rate):g}%): {esc(money(tax))}</p>
  <p style="text-align:right;margin:8px 0 20px;font-size:1.15em;font-weight:bold;">{esc(labels['total'])}: {esc(money(total))}</p>
  {notes_html}
</body></html>"""


def send_invoice_sms(*, to_phone: str, body: str) -> dict[str, Any]:
    """Send invoice SMS via Twilio. Returns {ok, configured, detail?}. Never raises.

    Waits briefly for Twilio delivery status so queued→undelivered (e.g. A2P 30034)
    is reported as failure instead of a false “sent”.
    """
    if not twilio_configured():
        logger.warning(
            "Invoice SMS skipped: Twilio not configured "
            "(set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)."
        )
        return {
            "ok": False,
            "configured": False,
            "detail": "SMS is not configured",
        }

    to_e164 = normalize_phone_e164(to_phone)
    if not to_e164:
        return {"ok": False, "configured": True, "detail": "Invalid phone number"}

    text = (body or "").strip()
    if not text:
        return {"ok": False, "configured": True, "detail": "Empty message"}

    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()

    # Trial accounts reject custom bodies; body must be a Twilio template id
    # (e.g. sms_order_confirmation). See https://www.twilio.com/docs/usage/trials/try-out-sms
    trial_template = (
        os.getenv("TWILIO_TRIAL_SMS_TEMPLATE", "sms_order_confirmation").strip()
        or "sms_order_confirmation"
    )

    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(account_sid, auth_token)
        try:
            outcome = create_and_confirm_sms(
                client,
                body=text,
                from_number=from_number,
                to_e164=to_e164,
            )
        except TwilioRestException as exc:
            msg = str(exc)
            is_trial_template = (
                getattr(exc, "code", None) == 572006
                or "predefined SMS templates" in msg
                or "Invalid template name" in msg
            )
            if not is_trial_template:
                raise
            # Fall back to a predefined trial template (no custom invoice text).
            outcome = create_and_confirm_sms(
                client,
                body=trial_template,
                from_number=from_number,
                to_e164=to_e164,
            )
            if outcome.get("ok"):
                logger.info(
                    "Invoice SMS delivered to %s via trial template %s (%s)",
                    to_e164,
                    trial_template,
                    outcome.get("sid"),
                )
                return {
                    "ok": True,
                    "configured": True,
                    "trial_template": True,
                    "status": outcome.get("status"),
                    "sid": outcome.get("sid"),
                    "detail": (
                        "Sent with Twilio’s trial template (not full invoice text). "
                        "Upgrade Twilio to send the real invoice summary."
                    ),
                }
            logger.warning(
                "Invoice SMS trial template failed for %s: %s",
                to_e164,
                outcome.get("detail"),
            )
            return {
                "ok": False,
                "configured": True,
                "trial_template": True,
                "status": outcome.get("status"),
                "sid": outcome.get("sid"),
                "detail": outcome.get("detail")
                or twilio_error_detail(exc=exc),
            }

        if outcome.get("ok"):
            logger.info(
                "Invoice SMS delivered to %s (%s status=%s)",
                to_e164,
                outcome.get("sid"),
                outcome.get("status"),
            )
            return {
                "ok": True,
                "configured": True,
                "status": outcome.get("status"),
                "sid": outcome.get("sid"),
            }

        logger.warning(
            "Invoice SMS not delivered to %s: status=%s error=%s detail=%s",
            to_e164,
            outcome.get("status"),
            outcome.get("error_code"),
            outcome.get("detail"),
        )
        return {
            "ok": False,
            "configured": True,
            "status": outcome.get("status"),
            "sid": outcome.get("sid"),
            "detail": outcome.get("detail") or "Could not send SMS",
        }
    except Exception as exc:
        logger.exception("Invoice SMS failed for %s", to_e164)
        return {
            "ok": False,
            "configured": True,
            "detail": twilio_error_detail(exc=exc),
        }


def build_invoice_email_intro(
    *,
    business_name: str = "Barber Shop",
    invoice_number: str = "",
    customer_name: str = "",
    job_summary: str = "",
    lines: Optional[list[dict[str, Any]]] = None,
    tax_rate: float = 8.25,
    language: str = "en",
    pdf_filename: str = "invoice.pdf",
) -> tuple[str, str]:
    """Short plain + HTML intro when the full invoice is attached as PDF."""
    lang = "es" if (language or "").strip().lower().startswith("es") else "en"
    brand = (business_name or "").strip() or "Barber Shop"
    inv = (invoice_number or "").strip() or "—"
    name = (customer_name or "").strip()
    job = (job_summary or "").strip()
    _s, _m, _sub, _tax, total = compute_totals(lines or [], tax_rate)
    filename = (pdf_filename or "invoice.pdf").strip() or "invoice.pdf"

    if lang == "es":
        greet = f"Hola{(' ' + name) if name else ''},"
        lines_txt = [
            greet,
            "",
            f"Adjunto encontrará la factura {inv} en PDF ({filename}).",
        ]
        if job:
            lines_txt.append(f"Trabajo: {job}")
        lines_txt.extend(["", f"Total: {money(total)}", "", f"Gracias,", brand])
        text = "\n".join(lines_txt)
        html = (
            f"<p>{greet}</p>"
            f"<p>Adjunto encontrará la factura <strong>{inv}</strong> en PDF "
            f"(<code>{filename}</code>).</p>"
            + (f"<p>Trabajo: {job}</p>" if job else "")
            + f"<p><strong>Total: {money(total)}</strong></p>"
            f"<p>Gracias,<br>{brand}</p>"
        )
        return text, html

    greet = f"Hi{(' ' + name) if name else ''},"
    lines_txt = [
        greet,
        "",
        f"Please find invoice {inv} attached as a PDF ({filename}).",
    ]
    if job:
        lines_txt.append(f"Job: {job}")
    lines_txt.extend(["", f"Total: {money(total)}", "", f"Thank you,", brand])
    text = "\n".join(lines_txt)
    html = (
        f"<p>{greet}</p>"
        f"<p>Please find invoice <strong>{inv}</strong> attached as a PDF "
        f"(<code>{filename}</code>).</p>"
        + (f"<p>Job: {job}</p>" if job else "")
        + f"<p><strong>Total: {money(total)}</strong></p>"
        f"<p>Thank you,<br>{brand}</p>"
    )
    return text, html


def send_invoice_email(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str,
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: str = "invoice.pdf",
) -> dict[str, Any]:
    """Send invoice email via SendGrid. Returns {ok, configured, detail?}. Never raises."""
    if not is_valid_email(to_email or ""):
        if not email_configured():
            logger.warning(
                "Invoice email skipped: SendGrid not configured "
                "(set SENDGRID_API_KEY and EMAIL_FROM)."
            )
            return {
                "ok": False,
                "configured": False,
                "detail": "Email is not configured",
            }
        return {"ok": False, "configured": True, "detail": "Invalid email address"}
    attachments = None
    if pdf_bytes:
        attachments = [
            {
                "filename": (pdf_filename or "invoice.pdf").strip() or "invoice.pdf",
                "content": pdf_bytes,
                "type": "application/pdf",
            }
        ]
    return send_email(
        to_email=to_email,
        subject=subject or "Invoice",
        text_body=text_body,
        html_body=html_body,
        attachments=attachments,
    )
