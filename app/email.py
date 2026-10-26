"""Minimal SendGrid email sender (invoice share, password reset, /interested leads)."""

from __future__ import annotations

import base64
import html
import json
import logging
import re
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, Optional

from app.config import (
    BUSINESS_NAME,
    EMAIL_FROM,
    EMAIL_FROM_NAME,
    INTEREST_NOTIFY_EMAIL,
    SENDGRID_API_KEY,
)

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def email_configured() -> bool:
    return bool(SENDGRID_API_KEY and EMAIL_FROM and is_valid_email(EMAIL_FROM))


def is_valid_email(value: str) -> bool:
    return bool(value and _EMAIL_RE.match(value.strip()))


def send_email(
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
    attachments: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    """Send email via SendGrid. Returns {ok, configured, detail?}. Never raises.

    Optional ``attachments`` items: ``{filename, content (bytes), type?}``.
    """
    if not email_configured():
        logger.warning(
            "Email skipped: SendGrid not configured (set SENDGRID_API_KEY and EMAIL_FROM)."
        )
        return {
            "ok": False,
            "configured": False,
            "detail": "Email is not configured",
        }

    dest = (to_email or "").strip()
    if not is_valid_email(dest):
        return {"ok": False, "configured": True, "detail": "Invalid email address"}

    from_name = EMAIL_FROM_NAME or BUSINESS_NAME or "Barber Shop"
    payload: dict[str, Any] = {
        "personalizations": [{"to": [{"email": dest}]}],
        "from": {"email": EMAIL_FROM, "name": from_name},
        "subject": (subject or "").strip() or "Barber Shop",
        "content": [
            {"type": "text/plain", "value": text_body or " "},
            {
                "type": "text/html",
                "value": html_body or f"<pre>{text_body or ' '}</pre>",
            },
        ],
    }
    if attachments:
        sg_attachments = []
        for item in attachments:
            raw = item.get("content")
            if raw is None:
                continue
            if isinstance(raw, str):
                raw_bytes = raw.encode("utf-8")
            else:
                raw_bytes = bytes(raw)
            filename = (item.get("filename") or "attachment").strip() or "attachment"
            mime = (item.get("type") or "application/octet-stream").strip()
            sg_attachments.append(
                {
                    "content": base64.b64encode(raw_bytes).decode("ascii"),
                    "filename": filename,
                    "type": mime,
                    "disposition": "attachment",
                }
            )
        if sg_attachments:
            payload["attachments"] = sg_attachments

    req = urllib.request.Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if 200 <= getattr(resp, "status", 202) < 300:
                logger.info("Email sent to %s", dest)
                return {"ok": True, "configured": True}
            logger.warning("Email unexpected status for %s", dest)
            return {"ok": False, "configured": True, "detail": "Could not send email"}
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")[:400]
        except Exception:
            body = ""
        logger.warning(
            "Email HTTP %s for %s: %s",
            getattr(exc, "code", "?"),
            dest,
            body or exc.reason,
        )
        detail = "Could not send email"
        if exc.code in (401, 403):
            detail = "SendGrid rejected the API key (check SENDGRID_API_KEY)"
        elif exc.code == 400 and "from" in body.lower():
            detail = "SendGrid rejected EMAIL_FROM (verify the sender in SendGrid)"
        return {"ok": False, "configured": True, "detail": detail}
    except Exception:
        logger.exception("Email failed for %s", dest)
        return {"ok": False, "configured": True, "detail": "Could not send email"}


def notify_site_interest_inquiry(
    *,
    name: str,
    email: str,
    phone: str = "",
    business_name: str = "",
    message: str = "",
    created_at: Optional[datetime] = None,
) -> dict[str, Any]:
    """Best-effort notify INTEREST_NOTIFY_EMAIL of a /interested lead. Never raises."""
    when = created_at or datetime.utcnow()
    stamp = when.strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "New shop site inquiry from /interested",
        "",
        f"Name: {name or '—'}",
        f"Email: {email or '—'}",
        f"Phone: {phone or '—'}",
        f"Business name: {business_name or '—'}",
        f"Submitted: {stamp}",
        "",
        "Message:",
        message or "(none)",
    ]
    text_body = "\n".join(lines)
    esc = html.escape
    html_body = (
        "<p><strong>New shop site inquiry</strong> from <code>/interested</code></p>"
        "<ul>"
        f"<li><strong>Name:</strong> {esc(name or '—')}</li>"
        f"<li><strong>Email:</strong> {esc(email or '—')}</li>"
        f"<li><strong>Phone:</strong> {esc(phone or '—')}</li>"
        f"<li><strong>Business name:</strong> {esc(business_name or '—')}</li>"
        f"<li><strong>Submitted:</strong> {esc(stamp)}</li>"
        "</ul>"
        f"<p><strong>Message:</strong></p><pre>{esc(message or '(none)')}</pre>"
    )
    result = send_email(
        to_email=INTEREST_NOTIFY_EMAIL,
        subject="Want this for your shop? — new lead",
        text_body=text_body,
        html_body=html_body,
    )
    if not result.get("ok"):
        logger.warning(
            "Site-interest notify to %s failed: %s",
            INTEREST_NOTIFY_EMAIL,
            result.get("detail") or "unknown",
        )
    return result
