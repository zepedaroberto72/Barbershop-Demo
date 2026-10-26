"""Twilio booking-confirmation SMS. Never raises into the booking request path."""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Final delivery outcomes (stop polling). "sent" can still become undelivered.
_SMS_TERMINAL = frozenset({"delivered", "undelivered", "failed", "canceled", "received", "read"})

_DAY_EN = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
_DAY_ES = ("lun", "mar", "mié", "jue", "vie", "sáb", "dom")
_MONTH_EN = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)
_MONTH_ES = (
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
)


def _env_truthy(name: str, default: str = "") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def twilio_configured() -> bool:
    return bool(
        os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        and os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        and os.getenv("TWILIO_FROM_NUMBER", "").strip()
    )


def twilio_error_detail(
    *,
    error_code: Any = None,
    error_message: Any = None,
    status: str = "",
    exc: Any = None,
) -> str:
    """User-facing explanation for Twilio create/delivery failures."""
    code = error_code
    msg = (str(error_message).strip() if error_message else "") or ""
    if exc is not None and code is None:
        code = getattr(exc, "code", None)
    if exc is not None and not msg:
        msg = str(getattr(exc, "msg", None) or exc).strip()

    try:
        code_int = int(code) if code is not None else None
    except (TypeError, ValueError):
        code_int = None

    if code_int == 30034:
        return (
            "Twilio blocked delivery (error 30034): this US number isn’t registered "
            "for A2P 10DLC. Register the Brand/Campaign in Twilio Console and attach "
            f"{os.getenv('TWILIO_FROM_NUMBER', '').strip() or 'TWILIO_FROM_NUMBER'} "
            "to the Messaging Service — or use a Toll-Free sender."
        )
    if code_int == 21660:
        return (
            "Twilio rejected the From number (21660). Set TWILIO_FROM_NUMBER to the "
            "number shown in Console → Messaging → Try it out / Phone Numbers."
        )
    if code_int == 21211:
        return "Invalid destination phone number."
    if code_int == 21610:
        return "That number has opted out (STOP). It can’t receive texts from this sender."
    if code_int == 21614:
        return "That number is not a valid mobile number for SMS."
    if code_int in {21408, 21612}:
        return "SMS to that region/number isn’t permitted on this Twilio account."
    if code_int == 572006 or "predefined SMS templates" in msg or "Invalid template name" in msg:
        return (
            "Twilio trial can’t send custom invoice text — upgrade the account, "
            "or check TWILIO_FROM_NUMBER matches the trial number in Console → Send an SMS."
        )
    if "unverified" in msg.lower():
        return (
            "Destination number isn’t verified for this Twilio trial — "
            "add it under Verified Caller IDs."
        )

    status_l = (status or "").strip().lower()
    if status_l == "undelivered":
        base = "SMS was not delivered"
        if code_int:
            return f"{base} (Twilio error {code_int}{': ' + msg if msg else ''})."
        return f"{base}."
    if status_l == "failed":
        base = "SMS failed to send"
        if code_int:
            return f"{base} (Twilio error {code_int}{': ' + msg if msg else ''})."
        return f"{base}."

    if msg:
        return msg if len(msg) < 220 else msg[:217] + "…"
    if code_int:
        return f"Could not send SMS (Twilio error {code_int})."
    return "Could not send SMS"


def create_and_confirm_sms(
    client: Any,
    *,
    body: str,
    from_number: str,
    to_e164: str,
    poll_seconds: float = 9.0,
    poll_interval: float = 1.2,
) -> dict[str, Any]:
    """
    Create a Twilio message and briefly poll until a terminal status when needed.

    Returns dict with: ok, status, sid?, error_code?, detail?
    Never raises for delivery outcomes; create API errors propagate to the caller.
    """
    message = client.messages.create(body=body, from_=from_number, to=to_e164)
    sid = getattr(message, "sid", None)
    status = (getattr(message, "status", None) or "").strip().lower()
    error_code = getattr(message, "error_code", None)
    error_message = getattr(message, "error_message", None)

    deadline = time.monotonic() + max(0.0, float(poll_seconds))
    while sid and status not in _SMS_TERMINAL:
        if time.monotonic() >= deadline:
            break
        time.sleep(max(0.2, float(poll_interval)))
        message = client.messages(sid).fetch()
        status = (getattr(message, "status", None) or "").strip().lower()
        error_code = getattr(message, "error_code", None)
        error_message = getattr(message, "error_message", None)

    if status in {"delivered", "read", "received"}:
        return {
            "ok": True,
            "status": status,
            "sid": sid,
            "error_code": error_code,
        }

    if status in {"undelivered", "failed", "canceled"}:
        detail = twilio_error_detail(
            error_code=error_code,
            error_message=error_message,
            status=status,
        )
        return {
            "ok": False,
            "status": status,
            "sid": sid,
            "error_code": error_code,
            "detail": detail,
        }

    # "sent" after polling: handed to carrier with no error yet — accept as success.
    if status == "sent" and not error_code:
        return {
            "ok": True,
            "status": status,
            "sid": sid,
            "error_code": error_code,
        }

    # Still queued/accepted/sending after polling — not confirmed.
    detail = (
        f"Twilio accepted the message (status={status or 'queued'}) but delivery "
        "wasn’t confirmed. If nothing arrives, check A2P 10DLC registration for "
        f"{from_number} (error 30034) in Twilio Console."
    )
    return {
        "ok": False,
        "status": status or "queued",
        "sid": sid,
        "error_code": error_code,
        "detail": detail,
    }


def sms_enabled() -> bool:
    """Send SMS when Twilio creds exist, unless SMS_ON_BOOKING explicitly disables it."""
    if not twilio_configured():
        return False
    raw = os.getenv("SMS_ON_BOOKING", "").strip()
    if not raw:
        return True
    return _env_truthy("SMS_ON_BOOKING")


def normalize_phone_e164(raw: str, default_region: str = "US") -> Optional[str]:
    """Normalize to E.164. US-centric: 10 digits → +1…; 11 digits starting with 1 → +1…"""
    if not raw or not str(raw).strip():
        return None
    text = str(raw).strip()
    if text.startswith("+"):
        digits = re.sub(r"\D", "", text)
        if len(digits) < 8 or len(digits) > 15:
            return None
        return f"+{digits}"

    digits = re.sub(r"\D", "", text)
    if not digits:
        return None

    region = (default_region or "US").upper()
    if region == "US":
        if len(digits) == 10:
            return f"+1{digits}"
        if len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"
        if 8 <= len(digits) <= 15:
            # Already includes country code without +
            return f"+{digits}"
        return None

    if 8 <= len(digits) <= 15:
        return f"+{digits}"
    return None


def _format_when(starts_at: datetime, lang: str) -> str:
    day_names = _DAY_ES if lang == "es" else _DAY_EN
    month_names = _MONTH_ES if lang == "es" else _MONTH_EN
    day = day_names[starts_at.weekday()]
    month = month_names[starts_at.month - 1]
    hour = starts_at.hour % 12 or 12
    minute = starts_at.minute
    if lang == "es":
        suffix = "am" if starts_at.hour < 12 else "pm"
        time_part = f"{hour}:{minute:02d} {suffix}"
        return f"{day} {starts_at.day} {month}, {time_part}"
    suffix = "AM" if starts_at.hour < 12 else "PM"
    time_part = f"{hour}:{minute:02d} {suffix}"
    return f"{day} {month} {starts_at.day}, {time_part}"


def build_confirmation_message(
    *,
    starts_at: datetime,
    appliance: str = "",
    job_type: str = "",
    tech_name: str = "",
    business_name: str = "Barber Shop",
    language: str = "en",
) -> str:
    lang = "es" if (language or "").strip().lower().startswith("es") else "en"
    brand = (business_name or "").strip() or os.getenv("BUSINESS_NAME", "Barber Shop").strip() or "Barber Shop"
    when = _format_when(starts_at, lang)
    job_bits = " ".join(p for p in [(appliance or "").strip(), (job_type or "").strip()] if p)
    tech = (tech_name or "").strip()

    if lang == "es":
        parts = [f"{brand}: Cita confirmada — {when}."]
        if job_bits:
            parts.append(f"{job_bits}.")
        if tech:
            parts.append(f"Técnico: {tech}.")
        return " ".join(parts)

    parts = [f"{brand}: Confirmed — {when}."]
    if job_bits:
        parts.append(f"{job_bits}.")
    if tech:
        parts.append(f"Tech: {tech}.")
    return " ".join(parts)


def send_booking_sms(
    *,
    to_phone: str,
    starts_at: datetime,
    appliance: str = "",
    job_type: str = "",
    tech_name: str = "",
    business_name: str = "Barber Shop",
    language: str = "en",
) -> bool:
    """
    Send a booking confirmation SMS via Twilio.
    Returns True if sent. On skip/failure logs a warning and returns False — never raises.
    """
    if not sms_enabled():
        if not twilio_configured():
            logger.warning(
                "Booking SMS skipped: Twilio not configured "
                "(set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)."
            )
        else:
            logger.warning("Booking SMS skipped: SMS_ON_BOOKING is disabled.")
        return False

    to_e164 = normalize_phone_e164(to_phone)
    if not to_e164:
        logger.warning("Booking SMS skipped: could not normalize phone %r", to_phone)
        return False

    body = build_confirmation_message(
        starts_at=starts_at,
        appliance=appliance,
        job_type=job_type,
        tech_name=tech_name,
        business_name=business_name,
        language=language,
    )
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()

    trial_template = (
        os.getenv("TWILIO_TRIAL_SMS_TEMPLATE_BOOKING", "sms_appointment_reminders").strip()
        or "sms_appointment_reminders"
    )
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(account_sid, auth_token)
        try:
            client.messages.create(body=body, from_=from_number, to=to_e164)
        except TwilioRestException as exc:
            msg = str(exc)
            is_trial_template = (
                getattr(exc, "code", None) == 572006
                or "predefined SMS templates" in msg
                or "Invalid template name" in msg
            )
            if not is_trial_template:
                raise
            client.messages.create(
                body=trial_template, from_=from_number, to=to_e164
            )
            logger.info(
                "Booking SMS sent to %s via trial template %s",
                to_e164,
                trial_template,
            )
            return True
        logger.info("Booking SMS sent to %s", to_e164)
        return True
    except Exception:
        logger.exception("Booking SMS failed for %s (appointment still saved)", to_e164)
        return False
