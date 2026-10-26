"""Post-booking notification hooks (customer + barber SMS / email+ICS).

Env (wire later — missing creds = log skip, booking still succeeds):
  Twilio SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
              optional SMS_ON_BOOKING=0 to force-disable
  Email/ICS:  SENDGRID_API_KEY, EMAIL_FROM  (optional EMAIL_FROM_NAME)

Never raise into the booking request path.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from app.config import BUSINESS_NAME, SHOP_ADDRESS
from app.email import email_configured, is_valid_email, send_email
from app.sms import send_booking_sms, sms_enabled, twilio_configured

logger = logging.getLogger(__name__)


def _brand(business_name: str = "") -> str:
    return (business_name or "").strip() or BUSINESS_NAME or "Barber Shop"


def _format_when(starts_at: datetime, duration_minutes: int = 0) -> str:
    end = starts_at + timedelta(minutes=max(0, int(duration_minutes or 0)))
    day = starts_at.strftime("%a %b %d").replace(" 0", " ")
    start_t = starts_at.strftime("%I:%M %p").lstrip("0")
    end_t = end.strftime("%I:%M %p").lstrip("0")
    if duration_minutes:
        return f"{day}, {start_t} – {end_t}"
    return f"{day}, {start_t}"


def _ics_escape(text: str) -> str:
    return (
        str(text or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def build_ics_event(
    *,
    uid: str,
    summary: str,
    description: str,
    starts_at: datetime,
    duration_minutes: int,
    location: str = "",
) -> str:
    """Single VEVENT as a full VCALENDAR document (UTC-naive local times as floating)."""
    mins = max(15, int(duration_minutes or 30))
    ends_at = starts_at + timedelta(minutes=mins)
    dt_start = starts_at.strftime("%Y%m%dT%H%M%S")
    dt_end = ends_at.strftime("%Y%m%dT%H%M%S")
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    loc = _ics_escape(location or SHOP_ADDRESS)
    return "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Barber Bookings//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            f"UID:{_ics_escape(uid)}",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{dt_start}",
            f"DTEND:{dt_end}",
            f"SUMMARY:{_ics_escape(summary)}",
            f"DESCRIPTION:{_ics_escape(description)}",
            f"LOCATION:{loc}",
            "END:VEVENT",
            "END:VCALENDAR",
            "",
        ]
    )


def notify_customer_sms(
    *,
    to_phone: str,
    starts_at: datetime,
    appliance: str = "",
    job_type: str = "",
    tech_name: str = "",
    business_name: str = "",
    language: str = "en",
    duration_minutes: int = 0,
    extra_summary: str = "",
) -> bool:
    """SMS confirmation to the customer. No-op + log if Twilio not configured."""
    if not sms_enabled():
        if not twilio_configured():
            logger.info(
                "notify_customer_sms skipped: SMS/email not configured "
                "(set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)."
            )
        else:
            logger.info("notify_customer_sms skipped: SMS_ON_BOOKING disabled.")
        return False
    ok = send_booking_sms(
        to_phone=to_phone,
        starts_at=starts_at,
        appliance=appliance,
        job_type=job_type,
        tech_name=tech_name,
        business_name=_brand(business_name),
        language=language,
    )
    if ok and extra_summary:
        logger.info("Customer SMS sent (%s)", extra_summary[:80])
    return ok


def notify_customer_email_with_ics(
    *,
    to_email: Optional[str],
    customer_name: str,
    starts_at: datetime,
    duration_minutes: int,
    appliance: str = "",
    tech_name: str = "",
    business_name: str = "",
    appointment_id: int = 0,
) -> bool:
    """Email customer a confirmation + .ics invite when email is provided."""
    dest = (to_email or "").strip()
    if not dest:
        return False
    if not email_configured():
        logger.info(
            "notify_customer_email_with_ics skipped: email not configured "
            "(set SENDGRID_API_KEY, EMAIL_FROM)."
        )
        return False
    if not is_valid_email(dest):
        logger.info("notify_customer_email_with_ics skipped: invalid email %r", dest)
        return False

    brand = _brand(business_name)
    when = _format_when(starts_at, duration_minutes)
    who = (tech_name or "").strip()
    services = (appliance or "").strip() or "Appointment"
    subject = f"{brand}: Booking confirmed — {when}"
    lines = [
        f"Hi {(customer_name or '').strip() or 'there'},",
        "",
        f"Your booking at {brand} is confirmed.",
        f"When: {when}",
        f"Services: {services}",
    ]
    if who:
        lines.append(f"Barber: {who}")
    if SHOP_ADDRESS:
        lines.append(f"Where: {SHOP_ADDRESS}")
    lines.extend(["", "A calendar invite is attached.", "", f"— {brand}"])
    text_body = "\n".join(lines)
    uid = f"booking-{appointment_id or 'x'}-{int(starts_at.timestamp())}@barber-bookings"
    ics = build_ics_event(
        uid=uid,
        summary=f"{brand}: {services}",
        description=text_body,
        starts_at=starts_at,
        duration_minutes=duration_minutes,
    )
    result = send_email(
        to_email=dest,
        subject=subject,
        text_body=text_body,
        attachments=[
            {
                "filename": "booking.ics",
                "content": ics.encode("utf-8"),
                "type": "text/calendar; method=REQUEST",
            }
        ],
    )
    return bool(result.get("ok"))


def notify_barber_sms(
    *,
    to_phone: Optional[str],
    barber_name: str,
    customer_name: str,
    starts_at: datetime,
    duration_minutes: int = 0,
    appliance: str = "",
    business_name: str = "",
) -> bool:
    """SMS the barber about their own slot only."""
    phone = (to_phone or "").strip()
    if not phone:
        logger.info(
            "notify_barber_sms skipped: no phone for barber %s",
            barber_name or "?",
        )
        return False
    if not sms_enabled():
        logger.info(
            "notify_barber_sms skipped: SMS not configured "
            "(TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)."
        )
        return False

    brand = _brand(business_name)
    services = (appliance or "").strip() or "Appointment"
    cust = (customer_name or "").strip() or "Customer"
    # Reuses Twilio path; message reads as a new booking for this barber's slot.
    return send_booking_sms(
        to_phone=phone,
        starts_at=starts_at,
        appliance=f"New booking — {services}",
        job_type=f"Client: {cust}",
        tech_name=barber_name or "",
        business_name=brand,
        language="en",
    )


def notify_barber_calendar_ics(
    *,
    to_email: Optional[str],
    barber_name: str,
    customer_name: str,
    starts_at: datetime,
    duration_minutes: int,
    appliance: str = "",
    business_name: str = "",
    appointment_id: int = 0,
) -> bool:
    """Email the barber an ICS for their slot (staff calendar via inbox)."""
    dest = (to_email or "").strip()
    if not dest:
        logger.info(
            "notify_barber_calendar_ics skipped: no email for barber %s",
            barber_name or "?",
        )
        return False
    if not email_configured():
        logger.info(
            "notify_barber_calendar_ics skipped: email not configured "
            "(SENDGRID_API_KEY, EMAIL_FROM)."
        )
        return False
    if not is_valid_email(dest):
        logger.info("notify_barber_calendar_ics skipped: invalid email %r", dest)
        return False

    brand = _brand(business_name)
    when = _format_when(starts_at, duration_minutes)
    services = (appliance or "").strip() or "Appointment"
    cust = (customer_name or "").strip() or "Customer"
    subject = f"{brand}: New booking — {when}"
    text_body = "\n".join(
        [
            f"Hi {(barber_name or 'there').strip()},",
            "",
            "You have a new booking:",
            f"When: {when}",
            f"Client: {cust}",
            f"Services: {services}",
            "",
            "Calendar invite attached.",
            "",
            f"— {brand}",
        ]
    )
    uid = f"barber-{appointment_id or 'x'}-{int(starts_at.timestamp())}@barber-bookings"
    ics = build_ics_event(
        uid=uid,
        summary=f"{brand}: {cust} — {services}",
        description=text_body,
        starts_at=starts_at,
        duration_minutes=duration_minutes,
    )
    result = send_email(
        to_email=dest,
        subject=subject,
        text_body=text_body,
        attachments=[
            {
                "filename": "appointment.ics",
                "content": ics.encode("utf-8"),
                "type": "text/calendar; method=REQUEST",
            }
        ],
    )
    return bool(result.get("ok"))


def notify_booking_created(
    *,
    appt: Any,
    customer_phone: str,
    customer_email: Optional[str],
    customer_name: str,
    business_name: str = "",
    language: str = "en",
    barber_phone: Optional[str] = None,
    barber_email: Optional[str] = None,
) -> None:
    """Fan-out all hooks after a successful appointment create. Never raises."""
    try:
        tech = getattr(appt, "technician", None)
        tech_name = getattr(tech, "name", "") or ""
        starts_at = appt.starts_at
        duration = int(getattr(appt, "duration_minutes", 30) or 30)
        appliance = getattr(appt, "appliance", "") or ""
        job_type = getattr(appt, "job_type", "") or ""
        appt_id = int(getattr(appt, "id", 0) or 0)
        brand = _brand(business_name)

        notify_customer_sms(
            to_phone=customer_phone,
            starts_at=starts_at,
            appliance=appliance,
            job_type=job_type,
            tech_name=tech_name,
            business_name=brand,
            language=language,
            duration_minutes=duration,
        )
        notify_customer_email_with_ics(
            to_email=customer_email,
            customer_name=customer_name,
            starts_at=starts_at,
            duration_minutes=duration,
            appliance=appliance,
            tech_name=tech_name,
            business_name=brand,
            appointment_id=appt_id,
        )
        notify_barber_sms(
            to_phone=barber_phone,
            barber_name=tech_name,
            customer_name=customer_name,
            starts_at=starts_at,
            duration_minutes=duration,
            appliance=appliance,
            business_name=brand,
        )
        notify_barber_calendar_ics(
            to_email=barber_email,
            barber_name=tech_name,
            customer_name=customer_name,
            starts_at=starts_at,
            duration_minutes=duration,
            appliance=appliance,
            business_name=brand,
            appointment_id=appt_id,
        )
    except Exception:
        logger.exception("Booking notifications failed (appointment still saved)")
