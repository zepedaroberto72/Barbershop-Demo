from __future__ import annotations

import json
import os
import re
import time as time_mod
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.auth import (
    clear_reset_token,
    current_user_optional,
    ensure_default_admin,
    find_user_for_reset,
    get_user_by_email,
    get_user_by_username,
    hash_password,
    login_user,
    logout_user,
    require_admin,
    require_user,
    send_password_reset_email,
    user_for_reset_token,
    user_public_dict,
    verify_password,
)
from app.email import email_configured, is_valid_email, notify_site_interest_inquiry
from app.config import (
    AUTH_DISABLED,
    BUSINESS_NAME,
    DEFAULT_JOB_DURATION,
    DEFAULT_TRAVEL_BUFFER,
    IS_PRODUCTION,
    SESSION_SECRET,
    SHOP_ADDRESS,
    SHOP_EMAIL,
    SHOP_HOURS,
    SHOP_PHONE,
    SHOP_TAGLINE,
    WORKDAY_END_HOUR,
    WORKDAY_START_HOUR,
)
from app.db import Base, engine, get_db, migrate_schema
from app.export_xlsx import build_invoice_workbook, build_past_workbook
from app.import_xlsx import rows_from_workbook_bytes
from app.models import (
    Appointment,
    Customer,
    Invoice,
    Service,
    SiteInterestInquiry,
    TechBlock,
    Technician,
    User,
)
from app.shop_settings import get_booking_hold_minutes, set_booking_hold_minutes
from app.geo import (
    address_ready_for_suggest,
    collapse_slots_nearest_tech,
    suggest_technician,
)
from app.scheduling import (
    appointment_fits,
    block_reason_on_day,
    calendar_day_bounds,
    day_bounds,
    normalize_hhmm,
    normalize_work_days,
    slot_blocked_by_blocks,
    suggest_slots,
    tech_day_bounds,
)
from app.invoice_pdf import build_invoice_pdf, invoice_pdf_filename
from app.invoice_share import (
    build_invoice_email_intro,
    build_invoice_summary,
    send_invoice_email,
    send_invoice_sms,
)
from app.schemas import (
    AnalyticsCount,
    AnalyticsDay,
    AnalyticsOut,
    AnalyticsSummary,
    AppointmentCreate,
    AppointmentHistoryPage,
    AppointmentOut,
    AppointmentUpdate,
    ChangePasswordIn,
    CustomerOut,
    ForgotPasswordIn,
    InvoiceDocumentBody,
    InvoiceExportBody,
    InvoiceLineIn,
    InvoiceOut,
    InvoiceSaveBody,
    InvoiceShareBody,
    NextInvoiceNumberOut,
    LoginIn,
    PublicBookCreate,
    PublicBookingLookup,
    PublicBookingOut,
    PublicBookingVerify,
    PublicReschedule,
    ResetPasswordIn,
    ServiceCreate,
    ServiceOut,
    ServiceUpdate,
    ShopSettingsOut,
    ShopSettingsUpdate,
    SlotSuggestion,
    TeamMemberCreate,
    TeamMemberOut,
    TeamMemberUpdate,
    TeamMoveIn,
    TeamReorderIn,
    TechBlockCreate,
    TechBlockOut,
    TechSuggestOut,
    TechnicianCreate,
    TechnicianOut,
    TechnicianUpdate,
    UserCreate,
    UserOut,
    UserResetPassword,
    UserUpdate,
)
from app.seed import ensure_services, reseed_week, reseed_year, seed_if_empty
from app.booking_notify import notify_booking_created
from app.team import ensure_team_links, next_tech_sort_order

BASE_DIR = Path(__file__).resolve().parent.parent

# Settings-only technician fields (Admin). Users may still PATCH work hours via Availability.
_SETTINGS_TECH_FIELDS = frozenset({"name", "color", "active", "start_location"})

app = FastAPI(title="Barber Shop")


# Auth pages + password-reset APIs (no session required).
_PUBLIC_PATHS = frozenset(
    {
        "/login",
        "/reset-password",
        "/book",
        "/privacy",
        "/terms",
        "/interested",
        "/api/auth/login",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/favicon.ico",
    }
)

# Public contact for Privacy / Terms pages (Twilio A2P & customer inquiries).
_LEGAL_CONTACT_EMAIL = "sample@email.com"

# Customer booking site (/book) — method-aware public APIs (no staff login).
# Static under /static/ (book.js, etc.) is already public via the /static/ prefix.
_PUBLIC_API_METHODS: dict[str, frozenset[str]] = {
    "/api/slots": frozenset({"GET", "HEAD"}),
    "/api/suggest-tech": frozenset({"GET", "HEAD"}),
    "/api/technicians": frozenset({"GET", "HEAD"}),
    "/api/services": frozenset({"GET", "HEAD"}),
    "/api/shop-settings": frozenset({"GET", "HEAD"}),
    "/api/appointments": frozenset({"POST"}),
}


def _is_public_request(path: str, method: str) -> bool:
    if path.startswith("/static/") or path in _PUBLIC_PATHS:
        return True
    # Future /book subpaths (e.g. /book/thanks) stay public.
    if path.startswith("/book/"):
        return True
    # Optional dedicated public API namespace for the booking site.
    if path.startswith("/api/public/"):
        return True
    allowed = _PUBLIC_API_METHODS.get(path)
    if allowed and method.upper() in allowed:
        return True
    return False


class AuthGateMiddleware(BaseHTTPMiddleware):
    """Require a login session for staff app pages/APIs.

    Public: static, login/reset, /privacy, /terms, /interested, customer /book site, and booking slot/create APIs.
    Temporary: AUTH_DISABLED=1 skips the gate (identity resolved as Admin in deps).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if _is_public_request(path, request.method):
            return await call_next(request)
        # Temporary password-login bypass — see AUTH_DISABLED in app/config.py.
        if AUTH_DISABLED:
            return await call_next(request)
        user_id = request.session.get("user_id")
        if not user_id:
            if path.startswith("/api/"):
                return JSONResponse({"detail": "Not authenticated"}, status_code=401)
            return RedirectResponse(url="/login", status_code=303)
        return await call_next(request)


# Last added = outermost: Session must wrap AuthGate so request.session exists.
app.add_middleware(AuthGateMiddleware)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="repairdesk_session",
    same_site="lax",
    https_only=IS_PRODUCTION,
    max_age=60 * 60 * 24 * 14,
)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

_CREATE_FIELD_LABELS = {
    "customer_name": "name",
    "customer_phone": "phone number",
    "customer_address": "address",
    "appliance": "appliance",
    "job_type": "job type",
    "issue": "issue",
    "technician_id": "technician",
    "starts_at": "time slot",
}


_CREATE_PATHS = frozenset({"/api/appointments", "/api/public/appointments"})

# Light in-memory rate limits for unauthenticated public booking (per process).
_rate_buckets: Dict[str, List[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for") or ""
    if forwarded.strip():
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _rate_limit(request: Request, key: str, *, limit: int, window_sec: int) -> None:
    """Reject with 429 when ``limit`` hits for ``key``+IP within ``window_sec``."""
    now = time_mod.time()
    bucket_key = f"{key}:{_client_ip(request)}"
    recent = [t for t in _rate_buckets[bucket_key] if now - t < window_sec]
    if len(recent) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again shortly.",
        )
    recent.append(now)
    _rate_buckets[bucket_key] = recent


@app.exception_handler(RequestValidationError)
async def booking_validation_handler(request: Request, exc: RequestValidationError):
    """Turn create-booking schema errors into clear 400 detail strings."""
    if request.url.path in _CREATE_PATHS and request.method == "POST":
        missing: List[str] = []
        for err in exc.errors():
            loc = err.get("loc") or ()
            field = next((p for p in loc if isinstance(p, str) and p != "body"), None)
            label = _CREATE_FIELD_LABELS.get(field or "", field or "field")
            if label not in missing:
                missing.append(label)
        if missing:
            if len(missing) == 1:
                detail = f"{missing[0].capitalize()} is required."
            else:
                detail = "Missing required fields: " + ", ".join(missing) + "."
            return JSONResponse(status_code=400, content={"detail": detail})
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    db = next(get_db())
    try:
        ensure_default_admin(db)
        # Set RESEED_YEAR=1 once to replace data with ~1 year of Central Valley demo jobs.
        # Set RESEED_WEEK=1 for the short board-week scenario only.
        reseed_year_flag = os.getenv("RESEED_YEAR", "").strip().lower() in {"1", "true", "yes"}
        reseed_week_flag = os.getenv("RESEED_WEEK", "").strip().lower() in {"1", "true", "yes"}
        if reseed_year_flag:
            reseed_year(db)
        elif reseed_week_flag:
            reseed_week(db)
        else:
            seed_if_empty(db)
        # After seed techs exist, link logins ↔ technicians (admin↔Alex, etc.).
        ensure_team_links(db)
    finally:
        db.close()


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    # Keep /login route; when auth is off, send staff straight into the desk.
    if AUTH_DISABLED or request.session.get("user_id"):
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "email_configured": email_configured()},
    )


@app.get("/reset-password", response_class=HTMLResponse)
def reset_password_page(request: Request):
    return templates.TemplateResponse(
        "reset_password.html",
        {"request": request, "token": request.query_params.get("token", "")},
    )


@app.get("/book", response_class=HTMLResponse)
@app.get("/book/", response_class=HTMLResponse)
def book_page(request: Request, db: Session = Depends(get_db)):
    """Public customer booking site (no staff login). Same appointment records as Scheduling."""
    hold_minutes = get_booking_hold_minutes(db)
    return templates.TemplateResponse(
        "book.html",
        {
            "request": request,
            "business_name": BUSINESS_NAME,
            "booking_hold_minutes": hold_minutes,
            "shop": {
                "tagline": SHOP_TAGLINE,
                "address": SHOP_ADDRESS,
                "phone": SHOP_PHONE,
                "email": SHOP_EMAIL,
                "hours": [{"day": d, "hours": h} for d, h in SHOP_HOURS],
                "booking_hold_minutes": hold_minutes,
            },
        },
    )


@app.get("/api/shop-settings", response_model=ShopSettingsOut)
def get_shop_settings(db: Session = Depends(get_db)):
    """Public shop rules used by /book (and Settings)."""
    return ShopSettingsOut(booking_hold_minutes=get_booking_hold_minutes(db))


@app.patch("/api/shop-settings", response_model=ShopSettingsOut)
def update_shop_settings(
    payload: ShopSettingsUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    minutes = set_booking_hold_minutes(db, payload.booking_hold_minutes)
    db.commit()
    return ShopSettingsOut(booking_hold_minutes=minutes)


@app.get("/api/services", response_model=List[ServiceOut])
def list_services(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(current_user_optional),
):
    ensure_services(db)
    db.commit()
    if include_inactive:
        if not user or (user.role or "").lower() != "admin" or not user.active:
            raise HTTPException(403, "Admin only")
    q = db.query(Service)
    if not include_inactive:
        q = q.filter(Service.active == 1)
    return q.order_by(Service.sort_order, Service.name).all()


@app.post("/api/services", response_model=ServiceOut)
def create_service(
    payload: ServiceCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: add a bookable service for the customer /book menu."""
    ensure_services(db)
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Service name is required.")
    row = Service(
        name=name,
        description=(payload.description or "").strip() or None,
        duration_minutes=int(payload.duration_minutes),
        price_cents=int(payload.price_cents),
        sort_order=int(payload.sort_order),
        active=1 if payload.active else 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.patch("/api/services/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: edit or deactivate a service."""
    row = db.query(Service).filter(Service.id == service_id).first()
    if not row:
        raise HTTPException(404, "Service not found.")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(400, "Service name is required.")
        row.name = name
    if "description" in data:
        desc = data["description"]
        row.description = (desc or "").strip() or None if desc is not None else None
    if "duration_minutes" in data and data["duration_minutes"] is not None:
        row.duration_minutes = int(data["duration_minutes"])
    if "price_cents" in data and data["price_cents"] is not None:
        row.price_cents = int(data["price_cents"])
    if "sort_order" in data and data["sort_order"] is not None:
        row.sort_order = int(data["sort_order"])
    if "active" in data and data["active"] is not None:
        row.active = 1 if data["active"] else 0
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/services/{service_id}")
def delete_service(
    service_id: int,
    permanent: bool = Query(False),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: deactivate (default) or permanently delete a service."""
    row = db.query(Service).filter(Service.id == service_id).first()
    if not row:
        raise HTTPException(404, "Service not found.")
    if permanent:
        db.delete(row)
        db.commit()
        return {"ok": True, "deleted": True}
    row.active = 0
    db.commit()
    return {"ok": True, "deleted": False, "active": 0}


@app.get("/privacy", response_class=HTMLResponse)
def privacy_page(request: Request):
    """Public Privacy Policy (Twilio A2P / customer disclosure). No staff login."""
    return templates.TemplateResponse(
        "legal.html",
        {
            "request": request,
            "doc": "privacy",
            "page_title": "Privacy Policy",
            "business_name": BUSINESS_NAME,
            "contact_email": _LEGAL_CONTACT_EMAIL,
        },
    )


@app.get("/terms", response_class=HTMLResponse)
def terms_page(request: Request):
    """Public Terms and Conditions (Twilio A2P / customer disclosure). No staff login."""
    return templates.TemplateResponse(
        "legal.html",
        {
            "request": request,
            "doc": "terms",
            "page_title": "Terms and Conditions",
            "business_name": BUSINESS_NAME,
            "contact_email": _LEGAL_CONTACT_EMAIL,
        },
    )


def _interested_page(
    request: Request,
    *,
    success: bool = False,
    error: Optional[str] = None,
    form_values: Optional[dict] = None,
):
    return templates.TemplateResponse(
        "interested.html",
        {
            "request": request,
            "business_name": BUSINESS_NAME,
            "success": success,
            "error": error,
            "form": form_values
            or {
                "name": "",
                "email": "",
                "phone": "",
                "business_name": "",
                "message": "",
            },
        },
    )


@app.get("/interested", response_class=HTMLResponse)
def interested_page(request: Request):
    """Public lead form for visitors interested in a similar booking site."""
    return _interested_page(request)


@app.post("/interested", response_class=HTMLResponse)
def interested_submit(
    request: Request,
    db: Session = Depends(get_db),
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    business_name: str = Form(""),
    message: str = Form(""),
):
    """Persist a site-interest inquiry (SQLite), notify by email, show success."""
    form_values = {
        "name": (name or "").strip(),
        "email": (email or "").strip(),
        "phone": (phone or "").strip(),
        "business_name": (business_name or "").strip(),
        "message": (message or "").strip(),
    }

    if not form_values["name"]:
        return _interested_page(
            request,
            error="Please enter your name.",
            form_values=form_values,
        )
    if not form_values["email"]:
        return _interested_page(
            request,
            error="Please enter your email address.",
            form_values=form_values,
        )
    if not is_valid_email(form_values["email"]):
        return _interested_page(
            request,
            error="Please enter a valid email address.",
            form_values=form_values,
        )
    if not form_values["phone"]:
        return _interested_page(
            request,
            error="Please enter your phone number.",
            form_values=form_values,
        )
    if len(form_values["message"]) > 2000:
        return _interested_page(
            request,
            error="Message is too long (max 2000 characters).",
            form_values=form_values,
        )

    inquiry = SiteInterestInquiry(
        name=form_values["name"][:120],
        email=(form_values["email"][:255] or None),
        phone=(form_values["phone"][:40] or None),
        business_name=(form_values["business_name"][:160] or None),
        message=(form_values["message"] or None),
    )
    db.add(inquiry)
    db.commit()
    # Email is best-effort: lead stays in SQLite even if SendGrid is down/unconfigured.
    try:
        notify_site_interest_inquiry(
            name=inquiry.name,
            email=inquiry.email or "",
            phone=inquiry.phone or "",
            business_name=inquiry.business_name or "",
            message=inquiry.message or "",
            created_at=inquiry.created_at,
        )
    except Exception:
        import logging as _logging

        _logging.getLogger("uvicorn.error").exception(
            "Site-interest email notify raised unexpectedly"
        )
    return _interested_page(request, success=True)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "business_name": BUSINESS_NAME,
            "shop_address": SHOP_ADDRESS,
            "defaults": {
                "job_duration": DEFAULT_JOB_DURATION,
                "travel_buffer": DEFAULT_TRAVEL_BUFFER,
                "workday_start": WORKDAY_START_HOUR,
                "workday_end": WORKDAY_END_HOUR,
            },
        },
    )


# —— Auth / users ——
# Roles: admin = Settings + full app; user = everything except Settings.


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        username=u.username,
        email=u.email,
        phone=getattr(u, "phone", None),
        role=u.role,
        active=int(u.active or 0),
        must_change_password=bool(int(getattr(u, "must_change_password", 0) or 0)),
        technician_id=getattr(u, "technician_id", None),
        created_at=u.created_at,
    )


def _normalize_user_email(email: str) -> str:
    addr = (email or "").strip().lower()
    if not is_valid_email(addr):
        raise HTTPException(400, "A valid email is required")
    return addr


def _normalize_user_phone(phone: str) -> str:
    value = (phone or "").strip()
    digits = re.sub(r"\D", "", value)
    if len(digits) < 7 or len(value) > 40:
        raise HTTPException(400, "A valid phone number is required")
    return value


def _team_member_out(user: User, tech: Technician) -> TeamMemberOut:
    return TeamMemberOut(
        id=user.id,
        username=user.username,
        email=user.email,
        phone=getattr(user, "phone", None),
        role=user.role,
        active=int(user.active or 0),
        must_change_password=bool(int(getattr(user, "must_change_password", 0) or 0)),
        technician_id=tech.id,
        name=tech.name,
        color=tech.color,
        start_location=tech.start_location,
        sort_order=int(getattr(tech, "sort_order", 0) or 0),
        created_at=user.created_at,
    )


def _tech_list_order():
    """Board / pickers / Settings Active list order."""
    return (
        Technician.active.desc(),
        Technician.sort_order.asc(),
        Technician.name.asc(),
        Technician.id.asc(),
    )


def _user_is_admin(user: User) -> bool:
    return (user.role or "").strip().lower() == "admin"


def _list_team_members(db: Session) -> List[TeamMemberOut]:
    ensure_team_links(db)
    users = (
        db.query(User)
        .join(Technician, User.technician_id == Technician.id)
        .order_by(
            User.active.desc(),
            Technician.sort_order.asc(),
            Technician.name.asc(),
            User.id.asc(),
        )
        .all()
    )
    return [_team_member_out(user, _require_linked_tech(db, user)) for user in users]


def _team_member_self(db: Session, user: User) -> List[TeamMemberOut]:
    """Staff Settings → Team: only the signed-in member’s row."""
    ensure_team_links(db)
    db.refresh(user)
    tech_id = getattr(user, "technician_id", None)
    if tech_id is None:
        return []
    tech = db.query(Technician).filter(Technician.id == tech_id).first()
    if not tech:
        return []
    return [_team_member_out(user, tech)]


def _assert_can_edit_own_technician(user: User, technician_id: int) -> None:
    """Non-admins may only change their linked barber’s hours / blocks."""
    if _user_is_admin(user):
        return
    linked = getattr(user, "technician_id", None)
    if linked is None or int(linked) != int(technician_id):
        raise HTTPException(403, "You can only manage your own availability")


def _renumber_active_techs(db: Session, ordered_techs: List[Technician]) -> None:
    """Assign contiguous sort_order 0..n-1 to the given active techs."""
    for i, tech in enumerate(ordered_techs):
        tech.sort_order = i


def _require_linked_tech(db: Session, user: User) -> Technician:
    if not user.technician_id:
        raise HTTPException(409, "Team member has no linked technician — restart the app to migrate")
    tech = db.query(Technician).filter(Technician.id == user.technician_id).first()
    if not tech:
        raise HTTPException(409, "Linked technician missing — restart the app to migrate")
    return tech


def _sync_pair_active(user: User, tech: Technician, active: int) -> None:
    flag = 1 if int(active) else 0
    user.active = flag
    tech.active = flag


def _assert_can_deactivate_admin(db: Session, target: User, admin: User) -> None:
    if target.id == admin.id:
        raise HTTPException(400, "You cannot deactivate your own account")
    if (
        target.role == "admin"
        and db.query(User)
        .filter(User.role == "admin", User.active == 1, User.id != target.id)
        .count()
        == 0
    ):
        raise HTTPException(400, "Cannot deactivate the last active admin")


@app.post("/api/auth/login")
def api_login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    user = get_user_by_username(db, username)
    if not user or not int(user.active or 0) or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    login_user(request, user)
    return user_public_dict(user)


@app.post("/api/auth/logout")
def api_logout(request: Request, _user: User = Depends(require_user)):
    logout_user(request)
    return {"ok": True}


@app.get("/api/auth/me")
def api_me(user: User = Depends(require_user)):
    return user_public_dict(user)


@app.post("/api/auth/change-password")
def api_change_password(
    payload: ChangePasswordIn,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    new_pw = payload.new_password.strip()
    if len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    user.password_hash = hash_password(new_pw)
    user.must_change_password = 0
    clear_reset_token(user)
    db.commit()
    return {"ok": True}


@app.post("/api/auth/forgot-password")
def api_forgot_password(
    payload: ForgotPasswordIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """Always return a generic success message to avoid username/email enumeration."""
    generic = {
        "ok": True,
        "detail": "If an account matches, a reset email was sent.",
        "email_configured": email_configured(),
    }
    user = find_user_for_reset(db, payload.username_or_email)
    if not user or not int(user.active or 0):
        return generic
    ok, detail = send_password_reset_email(request, user)
    if ok:
        db.commit()
    else:
        db.rollback()
        # Still generic to the client when email is configured; tell staff if SendGrid is missing.
        import logging as _logging

        _logging.getLogger("uvicorn.error").warning("Password reset email failed: %s", detail)
        if not email_configured():
            return {
                "ok": False,
                "detail": "Email is not configured. Ask an admin to reset your password in Settings → Users.",
                "email_configured": False,
            }
    return generic


@app.post("/api/auth/reset-password")
def api_reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    user = user_for_reset_token(db, payload.token)
    if not user:
        raise HTTPException(400, "This reset link is invalid or has expired")
    new_pw = payload.new_password.strip()
    if len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    user.password_hash = hash_password(new_pw)
    user.must_change_password = 0
    clear_reset_token(user)
    db.commit()
    return {"ok": True}


@app.get("/api/users", response_model=List[UserOut])
def list_users(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [_user_out(u) for u in db.query(User).order_by(User.username).all()]


@app.post("/api/users", response_model=UserOut)
def create_user(
    payload: UserCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Legacy create — also creates a linked technician (prefer POST /api/team)."""
    username = payload.username.strip().lower()
    if not re.match(r"^[a-z0-9._-]{2,80}$", username):
        raise HTTPException(400, "Username must be 2–80 chars: letters, numbers, . _ -")
    if get_user_by_username(db, username):
        raise HTTPException(409, "That username is already taken")
    email = _normalize_user_email(payload.email)
    if get_user_by_email(db, email):
        raise HTTPException(409, "That email is already in use")
    phone = _normalize_user_phone(payload.phone)
    display = username.replace(".", " ").replace("_", " ").title()
    tech = Technician(
        name=display,
        color="#0D9488",
        start_location="Shop",
        active=1,
        sort_order=next_tech_sort_order(db),
    )
    db.add(tech)
    db.flush()
    user = User(
        username=username,
        email=email,
        phone=phone,
        password_hash=hash_password(payload.password.strip()),
        role=payload.role,
        active=1,
        must_change_password=1,
        technician_id=tech.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_out(user)


@app.patch("/api/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        email = _normalize_user_email(data["email"] or "")
        clash = get_user_by_email(db, email)
        if clash and clash.id != target.id:
            raise HTTPException(409, "That email is already in use")
        target.email = email
    if "phone" in data:
        target.phone = _normalize_user_phone(data["phone"] or "")
    if "role" in data and data["role"] is not None:
        if target.id == admin.id and data["role"] != "admin":
            raise HTTPException(400, "You cannot remove your own admin role")
        target.role = data["role"]
    if "active" in data and data["active"] is not None:
        new_active = 1 if int(data["active"]) else 0
        if not new_active:
            _assert_can_deactivate_admin(db, target, admin)
        target.active = new_active
        if target.technician_id:
            tech = db.query(Technician).filter(Technician.id == target.technician_id).first()
            if tech:
                tech.active = new_active
    db.commit()
    db.refresh(target)
    return _user_out(target)


@app.get("/api/team", response_model=List[TeamMemberOut])
def list_team(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Settings → Team: admin sees everyone; staff sees only themselves."""
    if _user_is_admin(user):
        return _list_team_members(db)
    return _team_member_self(db, user)


@app.post("/api/team", response_model=TeamMemberOut)
def create_team_member(
    payload: TeamMemberCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    username = payload.username.strip().lower()
    if not re.match(r"^[a-z0-9._-]{2,80}$", username):
        raise HTTPException(400, "Username must be 2–80 chars: letters, numbers, . _ -")
    if get_user_by_username(db, username):
        raise HTTPException(409, "That username is already taken")
    email = _normalize_user_email(payload.email)
    if get_user_by_email(db, email):
        raise HTTPException(409, "That email is already in use")
    phone = _normalize_user_phone(payload.phone)
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    color = _normalize_color(payload.color)
    start_location = (payload.start_location or "Shop").strip() or "Shop"
    name_clash = db.query(Technician).filter(Technician.name == name).first()
    if name_clash:
        if int(name_clash.active or 0) == 0 and not db.query(User).filter(
            User.technician_id == name_clash.id
        ).first():
            # Reactivate orphan inactive tech and attach a new login.
            name_clash.active = 1
            name_clash.color = color
            name_clash.start_location = start_location
            user = User(
                username=username,
                email=email,
                phone=phone,
                password_hash=hash_password(payload.password.strip()),
                role=payload.role,
                active=1,
                must_change_password=1,
                technician_id=name_clash.id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return _team_member_out(user, name_clash)
        raise HTTPException(409, "A team member with that display name already exists")
    tech = Technician(
        name=name,
        color=color,
        start_location=start_location,
        active=1,
        sort_order=next_tech_sort_order(db),
    )
    db.add(tech)
    db.flush()
    user = User(
        username=username,
        email=email,
        phone=phone,
        password_hash=hash_password(payload.password.strip()),
        role=payload.role,
        active=1,
        must_change_password=1,
        technician_id=tech.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tech)
    return _team_member_out(user, tech)


@app.patch("/api/team/reorder", response_model=List[TeamMemberOut])
def reorder_team(
    payload: TeamReorderIn,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Bulk set Active list order (user ids). Inactive members keep their sort_order."""
    ensure_team_links(db)
    seen: set[int] = set()
    ordered_techs: List[Technician] = []
    for member_id in payload.member_ids:
        if member_id in seen:
            raise HTTPException(400, "Duplicate member id in reorder list")
        seen.add(member_id)
        user = db.query(User).filter(User.id == member_id).first()
        if not user:
            raise HTTPException(404, f"Team member {member_id} not found")
        if not int(user.active or 0):
            raise HTTPException(400, "Only active members can be reordered")
        ordered_techs.append(_require_linked_tech(db, user))
    active_count = db.query(Technician).filter(Technician.active == 1).count()
    if len(ordered_techs) != active_count:
        raise HTTPException(
            400,
            "Reorder list must include every active team member exactly once",
        )
    _renumber_active_techs(db, ordered_techs)
    db.commit()
    return _list_team_members(db)


@app.patch("/api/team/{member_id}/move", response_model=List[TeamMemberOut])
def move_team_member(
    member_id: int,
    payload: TeamMoveIn,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Swap an active member one slot up or down (Settings → Team arrows)."""
    ensure_team_links(db)
    target = db.query(User).filter(User.id == member_id).first()
    if not target:
        raise HTTPException(404, "Team member not found")
    if not int(target.active or 0):
        raise HTTPException(400, "Only active members can be reordered")
    tech = _require_linked_tech(db, target)
    active_techs = (
        db.query(Technician)
        .filter(Technician.active == 1)
        .order_by(Technician.sort_order.asc(), Technician.name.asc(), Technician.id.asc())
        .all()
    )
    ids = [t.id for t in active_techs]
    try:
        idx = ids.index(tech.id)
    except ValueError as exc:
        raise HTTPException(404, "Linked technician is not active") from exc
    direction = (payload.direction or "").strip().lower()
    if direction == "up":
        if idx == 0:
            return _list_team_members(db)
        neighbor = idx - 1
    elif direction == "down":
        if idx >= len(active_techs) - 1:
            return _list_team_members(db)
        neighbor = idx + 1
    else:
        raise HTTPException(400, "direction must be 'up' or 'down'")
    ordered = list(active_techs)
    ordered[idx], ordered[neighbor] = ordered[neighbor], ordered[idx]
    _renumber_active_techs(db, ordered)
    db.commit()
    return _list_team_members(db)


@app.patch("/api/team/{member_id}", response_model=TeamMemberOut)
def update_team_member(
    member_id: int,
    payload: TeamMemberUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == member_id).first()
    if not target:
        raise HTTPException(404, "Team member not found")
    admin = _user_is_admin(user)
    if not admin and target.id != user.id:
        raise HTTPException(403, "You can only edit your own team profile")
    tech = _require_linked_tech(db, target)
    data = payload.model_dump(exclude_unset=True)
    if not admin:
        # Staff may update profile fields only — never role / active.
        data.pop("role", None)
        data.pop("active", None)
    if "email" in data:
        email = _normalize_user_email(data["email"] or "")
        clash = get_user_by_email(db, email)
        if clash and clash.id != target.id:
            raise HTTPException(409, "That email is already in use")
        target.email = email
    if "phone" in data:
        target.phone = _normalize_user_phone(data["phone"] or "")
    if "role" in data and data["role"] is not None:
        if target.id == user.id and data["role"] != "admin":
            raise HTTPException(400, "You cannot remove your own admin role")
        target.role = data["role"]
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(400, "Name is required")
        clash = (
            db.query(Technician)
            .filter(Technician.name == name, Technician.id != tech.id)
            .first()
        )
        if clash:
            raise HTTPException(409, "A team member with that display name already exists")
        tech.name = name
    if "color" in data and data["color"] is not None:
        tech.color = _normalize_color(data["color"])
    if "start_location" in data and data["start_location"] is not None:
        loc = data["start_location"].strip()
        tech.start_location = loc or "Shop"
    if "active" in data and data["active"] is not None:
        new_active = 1 if int(data["active"]) else 0
        if not new_active:
            _assert_can_deactivate_admin(db, target, user)
        _sync_pair_active(target, tech, new_active)
    db.commit()
    db.refresh(target)
    db.refresh(tech)
    return _team_member_out(target, tech)


@app.delete("/api/team/{member_id}", response_model=TeamMemberOut)
def delete_team_member(
    member_id: int,
    permanent: bool = Query(False),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft-deactivate by default (login + scheduler). permanent=true hard-deletes only with no jobs."""
    target = db.query(User).filter(User.id == member_id).first()
    if not target:
        raise HTTPException(404, "Team member not found")
    tech = _require_linked_tech(db, target)
    if permanent:
        _assert_can_deactivate_admin(db, target, admin)
        has_jobs = (
            db.query(Appointment.id)
            .filter(Appointment.technician_id == tech.id)
            .limit(1)
            .first()
        )
        if has_jobs:
            raise HTTPException(
                409,
                "Cannot permanently delete a team member with appointments. Deactivate instead.",
            )
        snapshot = _team_member_out(target, tech)
        snapshot.active = 0
        db.delete(target)
        db.delete(tech)
        db.commit()
        return snapshot
    _assert_can_deactivate_admin(db, target, admin)
    _sync_pair_active(target, tech, 0)
    db.commit()
    db.refresh(target)
    db.refresh(tech)
    return _team_member_out(target, tech)


@app.post("/api/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    payload: UserResetPassword,
    request: Request,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin sets a temporary password; optionally also emails a reset link."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    new_pw = payload.new_password.strip()
    if len(new_pw) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    target.password_hash = hash_password(new_pw)
    target.must_change_password = 1
    email_sent = False
    email_detail = None
    if payload.send_email:
        ok, detail = send_password_reset_email(request, target)
        email_sent = ok
        email_detail = detail
        if not ok:
            # Temp password still saved; report email failure separately.
            pass
    db.commit()
    return {
        "ok": True,
        "email_sent": email_sent,
        "email_detail": email_detail,
        "email_configured": email_configured(),
    }


@app.post("/api/users/{user_id}/send-reset-email")
def send_user_reset_email(
    user_id: int,
    request: Request,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    ok, detail = send_password_reset_email(request, target)
    if not ok:
        db.rollback()
        raise HTTPException(400, detail)
    db.commit()
    return {"ok": True, "detail": detail}



def _normalize_color(color: str) -> str:
    value = (color or "").strip()
    if not value.startswith("#"):
        value = f"#{value}"
    if len(value) not in (4, 7):
        raise HTTPException(400, "Color must be a hex value like #0D9488")
    return value.upper() if len(value) == 7 else value


def _apply_work_fields(
    tech: Technician,
    *,
    work_start: Optional[str] = None,
    work_end: Optional[str] = None,
    work_days: Optional[str] = None,
) -> None:
    if work_start is not None:
        tech.work_start = normalize_hhmm(work_start, WORKDAY_START_HOUR)
    if work_end is not None:
        tech.work_end = normalize_hhmm(work_end, WORKDAY_END_HOUR)
    if work_days is not None:
        tech.work_days = normalize_work_days(work_days)
    start = normalize_hhmm(tech.work_start, WORKDAY_START_HOUR)
    end = normalize_hhmm(tech.work_end, WORKDAY_END_HOUR)
    if end <= start:
        raise HTTPException(400, "Work end must be after work start.")


def _resolve_block_range(
    start: date,
    end: Optional[date],
    span: Optional[str],
) -> tuple[date, date]:
    kind = (span or "").strip().lower()
    if kind in {"day", "hours"}:
        return start, start
    if kind == "week":
        monday = start - timedelta(days=start.weekday())
        return monday, monday + timedelta(days=6)
    if kind == "month":
        first = start.replace(day=1)
        if first.month == 12:
            nxt = first.replace(year=first.year + 1, month=1, day=1)
        else:
            nxt = first.replace(month=first.month + 1, day=1)
        return first, nxt - timedelta(days=1)
    if kind and kind not in {"day", "hours", "week", "month"}:
        raise HTTPException(400, "span must be hours, day, week, or month.")
    end_date = end or start
    if end_date < start:
        raise HTTPException(400, "End date must be on or after start date.")
    return start, end_date


def _normalize_block_times(
    start_time: Optional[str],
    end_time: Optional[str],
    *,
    require_hours: bool = False,
) -> tuple[Optional[str], Optional[str]]:
    start_raw = (start_time or "").strip() or None
    end_raw = (end_time or "").strip() or None
    if require_hours and (not start_raw or not end_raw):
        raise HTTPException(400, "Hour blocks require start_time and end_time.")
    if bool(start_raw) != bool(end_raw):
        raise HTTPException(400, "Provide both start_time and end_time, or neither for a full-day block.")
    if not start_raw:
        return None, None
    start_norm = normalize_hhmm(start_raw, 0)
    end_norm = normalize_hhmm(end_raw, 23)
    if end_norm <= start_norm:
        raise HTTPException(400, "Block end_time must be after start_time.")
    return start_norm, end_norm


def _blocks_for_techs(
    db: Session,
    tech_ids: List[int],
    day: date,
) -> Dict[int, List[TechBlock]]:
    if not tech_ids:
        return {}
    rows = (
        db.query(TechBlock)
        .filter(
            TechBlock.technician_id.in_(tech_ids),
            TechBlock.start_date <= day,
            TechBlock.end_date >= day,
        )
        .all()
    )
    out: Dict[int, List[TechBlock]] = {tid: [] for tid in tech_ids}
    for row in rows:
        out.setdefault(row.technician_id, []).append(row)
    return out


def _assert_tech_schedulable(tech: Technician, day: date, db: Session) -> tuple[datetime, datetime]:
    """Ensure tech works this day and is not blocked; return work window."""
    blocked = block_reason_on_day(
        db.query(TechBlock)
        .filter(
            TechBlock.technician_id == tech.id,
            TechBlock.start_date <= day,
            TechBlock.end_date >= day,
        )
        .all(),
        day,
    )
    if blocked:
        raise HTTPException(409, f"Technician is blocked off ({blocked}).")
    bounds = tech_day_bounds(tech, day)
    if not bounds:
        raise HTTPException(409, "Technician does not work on that day.")
    return bounds


@app.get("/api/technicians", response_model=List[TechnicianOut])
def list_technicians(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(Technician)
    if not include_inactive:
        q = q.filter(Technician.active == 1)
    return q.order_by(*_tech_list_order()).all()


@app.post("/api/technicians", response_model=TechnicianOut)
def create_technician(
    payload: TechnicianCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create scheduler row + linked login (prefer POST /api/team for full contact fields)."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    color = _normalize_color(payload.color)
    start_location = (payload.start_location or "Shop").strip() or "Shop"
    work_start = normalize_hhmm(payload.work_start, WORKDAY_START_HOUR)
    work_end = normalize_hhmm(payload.work_end, WORKDAY_END_HOUR)
    work_days = normalize_work_days(payload.work_days)
    if work_end <= work_start:
        raise HTTPException(400, "Work end must be after work start.")
    existing = db.query(Technician).filter(Technician.name == name).first()
    if existing:
        # Same name inactive → reactivate instead of creating a duplicate row.
        if int(existing.active or 0) == 0:
            existing.active = 1
            existing.color = color
            existing.start_location = start_location
            _apply_work_fields(
                existing,
                work_start=work_start,
                work_end=work_end,
                work_days=work_days,
            )
            linked = db.query(User).filter(User.technician_id == existing.id).first()
            if linked:
                linked.active = 1
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(409, "A technician with that name already exists")
    tech = Technician(
        name=name,
        color=color,
        start_location=start_location,
        active=1,
        sort_order=next_tech_sort_order(db),
        work_start=work_start,
        work_end=work_end,
        work_days=work_days,
    )
    db.add(tech)
    db.flush()
    # Linked desk login so Team stays 1:1 (placeholder contact — edit in Settings → Team).
    from app.team import unique_username

    uname = unique_username(db, name)
    user = User(
        username=uname,
        email=f"{uname}@example.com",
        phone="555-0000",
        password_hash=hash_password("changeme123"),
        role="user",
        active=1,
        must_change_password=1,
        technician_id=tech.id,
    )
    db.add(user)
    db.commit()
    db.refresh(tech)
    return tech


@app.patch("/api/technicians/{technician_id}", response_model=TechnicianOut)
def update_technician(
    technician_id: int,
    payload: TechnicianUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Work hours: admin (any) or linked staff (self). Name/color/active/location: Admin."""
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise HTTPException(404, "Technician not found")
    data = payload.model_dump(exclude_unset=True)
    if any(k in data for k in _SETTINGS_TECH_FIELDS):
        if not _user_is_admin(user):
            raise HTTPException(403, "Admin access required")
    if any(k in data for k in ("work_start", "work_end", "work_days")):
        _assert_can_edit_own_technician(user, technician_id)
    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(400, "Name is required")
        clash = (
            db.query(Technician)
            .filter(Technician.name == name, Technician.id != technician_id)
            .first()
        )
        if clash:
            raise HTTPException(409, "A technician with that name already exists")
        tech.name = name
    if "color" in data and data["color"] is not None:
        tech.color = _normalize_color(data["color"])
    if "start_location" in data and data["start_location"] is not None:
        loc = data["start_location"].strip()
        tech.start_location = loc or "Shop"
    if "active" in data and data["active"] is not None:
        new_active = 1 if int(data["active"]) else 0
        tech.active = new_active
        linked = db.query(User).filter(User.technician_id == tech.id).first()
        if linked:
            if not new_active and linked.role == "admin":
                # Avoid orphaning the last admin via tech soft-delete.
                other_admins = (
                    db.query(User)
                    .filter(User.role == "admin", User.active == 1, User.id != linked.id)
                    .count()
                )
                if other_admins == 0:
                    raise HTTPException(400, "Cannot deactivate the last active admin")
            linked.active = new_active
    if any(k in data for k in ("work_start", "work_end", "work_days")):
        _apply_work_fields(
            tech,
            work_start=data.get("work_start"),
            work_end=data.get("work_end"),
            work_days=data.get("work_days"),
        )
    db.commit()
    db.refresh(tech)
    return tech


@app.delete("/api/technicians/{technician_id}", response_model=TechnicianOut)
def delete_technician(
    technician_id: int,
    permanent: bool = Query(False),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft-deactivate by default (also deactivates linked login).

    Pass permanent=true to hard-delete only when the tech has no appointments.
    """
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise HTTPException(404, "Technician not found")
    linked = db.query(User).filter(User.technician_id == tech.id).first()
    if permanent:
        has_jobs = (
            db.query(Appointment.id)
            .filter(Appointment.technician_id == technician_id)
            .limit(1)
            .first()
        )
        if has_jobs:
            raise HTTPException(
                409,
                "Cannot permanently delete a technician with appointments. Remove instead.",
            )
        snapshot = TechnicianOut(
            id=tech.id,
            name=tech.name,
            color=tech.color,
            start_location=tech.start_location,
            active=0,
            sort_order=int(getattr(tech, "sort_order", 0) or 0),
            work_start=getattr(tech, "work_start", None) or "08:00",
            work_end=getattr(tech, "work_end", None) or "18:00",
            work_days=getattr(tech, "work_days", None) or "1,2,3,4,5",
        )
        if linked:
            db.delete(linked)
        db.delete(tech)
        db.commit()
        return snapshot
    if linked and linked.role == "admin":
        other_admins = (
            db.query(User)
            .filter(User.role == "admin", User.active == 1, User.id != linked.id)
            .count()
        )
        if other_admins == 0:
            raise HTTPException(400, "Cannot deactivate the last active admin")
    tech.active = 0
    if linked:
        linked.active = 0
    db.commit()
    db.refresh(tech)
    return tech


@app.get("/api/tech-blocks", response_model=List[TechBlockOut])
def list_tech_blocks(
    start: date = Query(..., description="Inclusive range start"),
    end: date = Query(..., description="Inclusive range end"),
    technician_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Blocks that overlap [start, end] (inclusive)."""
    if end < start:
        raise HTTPException(400, "end must be on or after start")
    q = db.query(TechBlock).filter(
        TechBlock.start_date <= end,
        TechBlock.end_date >= start,
    )
    if technician_id:
        q = q.filter(TechBlock.technician_id == technician_id)
    return q.order_by(TechBlock.start_date, TechBlock.technician_id).all()


@app.post("/api/technicians/{technician_id}/blocks", response_model=TechBlockOut)
def create_tech_block(
    technician_id: int,
    payload: TechBlockCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise HTTPException(404, "Technician not found")
    _assert_can_edit_own_technician(user, technician_id)
    span = (payload.span or "").strip().lower() or None
    start_date, end_date = _resolve_block_range(
        payload.start_date, payload.end_date, span
    )
    start_time, end_time = _normalize_block_times(
        payload.start_time,
        payload.end_time,
        require_hours=span == "hours",
    )
    reason = (payload.reason or "").strip() or None
    block = TechBlock(
        technician_id=technician_id,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        reason=reason,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@app.delete("/api/technicians/{technician_id}/blocks/{block_id}", response_model=TechBlockOut)
def delete_tech_block(
    technician_id: int,
    block_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    _assert_can_edit_own_technician(user, technician_id)
    block = (
        db.query(TechBlock)
        .filter(TechBlock.id == block_id, TechBlock.technician_id == technician_id)
        .first()
    )
    if not block:
        raise HTTPException(404, "Block not found")
    snapshot = TechBlockOut.model_validate(block)
    db.delete(block)
    db.commit()
    return snapshot


@app.get("/api/customers", response_model=List[CustomerOut])
def search_customers(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    like = f"%{q.strip()}%"
    return (
        db.query(Customer)
        .filter((Customer.phone.ilike(like)) | (Customer.name.ilike(like)))
        .order_by(Customer.name)
        .limit(10)
        .all()
    )


def _serialize_appointment(appt: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=appt.id,
        customer_id=appt.customer_id,
        technician_id=appt.technician_id,
        starts_at=appt.starts_at,
        ends_at=appt.ends_at,
        duration_minutes=appt.duration_minutes,
        travel_buffer_minutes=appt.travel_buffer_minutes,
        appliance=appt.appliance,
        job_type=getattr(appt, "job_type", None) or "Repair",
        issue=appt.issue,
        status=appt.status,
        notes=appt.notes,
        customer=CustomerOut.model_validate(appt.customer),
        technician=TechnicianOut.model_validate(appt.technician),
    )


@app.get("/api/appointments", response_model=List[AppointmentOut])
def list_appointments(
    day: Optional[date] = Query(None, description="Single day (YYYY-MM-DD)"),
    start: Optional[date] = Query(None, description="Inclusive range start"),
    end: Optional[date] = Query(None, description="Inclusive range end"),
    db: Session = Depends(get_db),
):
    if start is not None and end is not None:
        if end < start:
            raise HTTPException(400, "end must be on or after start")
        if (end - start).days > 62:
            raise HTTPException(400, "Date range too large (max ~62 days)")
        # Full calendar days for week/month boards.
        range_start = datetime.combine(start, time.min)
        range_end = datetime.combine(end + timedelta(days=1), time.min)
    elif day is not None:
        # Full calendar day so customer /book appointments outside the legacy
        # 8–18 repair window still appear on the staff Booking board.
        range_start, range_end = calendar_day_bounds(day)
    else:
        raise HTTPException(400, "Provide day, or start and end")

    rows = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(
            Appointment.starts_at >= range_start,
            Appointment.starts_at < range_end,
            Appointment.status != "cancelled",
        )
        .order_by(Appointment.starts_at)
        .all()
    )
    return [_serialize_appointment(r) for r in rows]


def _week_monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


@app.get("/api/analytics", response_model=AnalyticsOut)
def get_analytics(
    start: Optional[date] = Query(None, description="Inclusive start day (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="Inclusive end day (YYYY-MM-DD)"),
    technician_id: Optional[int] = Query(None, description="Limit to one barber"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Aggregate appointment metrics for a date range (defaults to current board week)."""
    today = date.today()
    range_start = start or _week_monday(today)
    range_end = end or (range_start + timedelta(days=6))
    if range_end < range_start:
        raise HTTPException(400, "end must be on or after start")
    # Cap to keep queries snappy (about 2 years).
    if (range_end - range_start).days > 800:
        raise HTTPException(400, "Date range too large (max ~800 days)")

    # Staff: always their linked barber. Admin: optional filter (null = everyone).
    scoped_tech_id = technician_id
    if not _user_is_admin(user):
        linked = getattr(user, "technician_id", None)
        if linked is None:
            scoped_tech_id = -1  # no linked barber → empty result
        else:
            scoped_tech_id = int(linked)

    window_start = datetime.combine(range_start, time.min)
    window_end = datetime.combine(range_end + timedelta(days=1), time.min)

    q = (
        db.query(Appointment)
        .options(joinedload(Appointment.technician))
        .filter(
            Appointment.starts_at >= window_start,
            Appointment.starts_at < window_end,
        )
    )
    if scoped_tech_id is not None:
        q = q.filter(Appointment.technician_id == scoped_tech_id)
    rows = q.order_by(Appointment.starts_at).all()

    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    by_day_map: Dict[str, AnalyticsDay] = {}
    cursor = range_start
    while cursor <= range_end:
        key = cursor.isoformat()
        by_day_map[key] = AnalyticsDay(
            date=key,
            label=day_labels[cursor.weekday()],
            count=0,
            job_minutes=0,
            travel_minutes=0,
        )
        cursor += timedelta(days=1)

    tech_stats: Dict[int, dict] = {}
    job_type_counts: Dict[str, int] = defaultdict(int)
    appliance_counts: Dict[str, int] = defaultdict(int)
    status_counts: Dict[str, int] = defaultdict(int)

    active_job_minutes = 0
    active_travel_minutes = 0
    active_jobs = 0
    cancelled_jobs = 0

    for appt in rows:
        status = (appt.status or "scheduled").lower()
        status_counts[status] += 1
        day_key = appt.starts_at.date().isoformat()
        day_row = by_day_map.get(day_key)

        is_cancelled = status == "cancelled"
        if is_cancelled:
            cancelled_jobs += 1
        else:
            active_jobs += 1
            active_job_minutes += appt.duration_minutes
            active_travel_minutes += appt.travel_buffer_minutes
            job_type_counts[(appt.job_type or "Repair").strip() or "Repair"] += 1
            appliance_counts[(appt.appliance or "Other").strip() or "Other"] += 1
            if day_row:
                day_row.count += 1
                day_row.job_minutes += appt.duration_minutes
                day_row.travel_minutes += appt.travel_buffer_minutes

            tech = appt.technician
            tid = appt.technician_id
            if tid not in tech_stats:
                tech_stats[tid] = {
                    "label": tech.name if tech else f"Tech {tid}",
                    "color": tech.color if tech else None,
                    "count": 0,
                    "minutes": 0,
                    "travel_minutes": 0,
                }
            tech_stats[tid]["count"] += 1
            tech_stats[tid]["minutes"] += appt.duration_minutes
            tech_stats[tid]["travel_minutes"] += appt.travel_buffer_minutes

        if day_row and is_cancelled:
            # Still show cancelled in daily count as light activity? Skip — status chart covers it.
            pass

    if scoped_tech_id is not None and scoped_tech_id > 0:
        active_techs = 1
    else:
        active_techs = (
            db.query(Technician).filter(Technician.active == 1).count() or 1
        )
    workday_minutes = max(1, (WORKDAY_END_HOUR - WORKDAY_START_HOUR) * 60)
    num_days = (range_end - range_start).days + 1
    # Count weekdays for utilization denominator (weekends often lightly staffed).
    weekdays = sum(
        1
        for i in range(num_days)
        if (range_start + timedelta(days=i)).weekday() < 5
    ) or num_days
    available_minutes = active_techs * workday_minutes * weekdays
    booked_minutes = active_job_minutes + active_travel_minutes
    utilization = (
        round(100.0 * booked_minutes / available_minutes, 1) if available_minutes else 0.0
    )

    by_technician = [
        AnalyticsCount(
            label=s["label"],
            count=s["count"],
            color=s["color"],
            minutes=s["minutes"],
            travel_minutes=s["travel_minutes"],
        )
        for s in sorted(tech_stats.values(), key=lambda x: (-x["count"], x["label"]))
    ]
    by_job_type = [
        AnalyticsCount(label=k, count=v)
        for k, v in sorted(job_type_counts.items(), key=lambda x: (-x[1], x[0]))
    ]
    by_appliance = [
        AnalyticsCount(label=k, count=v)
        for k, v in sorted(appliance_counts.items(), key=lambda x: (-x[1], x[0]))
    ]
    by_status = [
        AnalyticsCount(label=k, count=v)
        for k, v in sorted(status_counts.items(), key=lambda x: (-x[1], x[0]))
    ]

    return AnalyticsOut(
        start=range_start.isoformat(),
        end=range_end.isoformat(),
        summary=AnalyticsSummary(
            total_jobs=len(rows),
            active_jobs=active_jobs,
            cancelled_jobs=cancelled_jobs,
            job_hours=round(active_job_minutes / 60.0, 1),
            travel_hours=round(active_travel_minutes / 60.0, 1),
            booked_hours=round(booked_minutes / 60.0, 1),
            available_hours=round(available_minutes / 60.0, 1),
            utilization_pct=utilization,
        ),
        by_day=list(by_day_map.values()),
        by_technician=by_technician,
        by_job_type=by_job_type,
        by_appliance=by_appliance,
        by_status=by_status,
    )


def _query_appointment_history(
    db: Session,
    *,
    status: Optional[str] = None,
    q: Optional[str] = None,
    phone: Optional[str] = None,
    mode: str = "past",
    limit: int = 80,
    offset: int = 0,
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> tuple[List[Appointment], int]:
    """Past jobs (before today or completed/cancelled) or recent appointments for invoicing.

    Returns ``(page_rows, total_matching)`` for limit/offset pagination.
    """
    today_start = datetime.combine(date.today(), time.min)
    if start is not None and end is not None and end < start:
        raise HTTPException(400, "end must be on or after start")
    offset = max(0, int(offset or 0))
    limit = max(1, int(limit or 1))
    query = db.query(Appointment).options(
        joinedload(Appointment.customer), joinedload(Appointment.technician)
    )

    if mode == "past":
        query = query.filter(
            or_(
                Appointment.starts_at < today_start,
                Appointment.status.in_(("completed", "cancelled")),
            )
        )
    if start is not None:
        query = query.filter(Appointment.starts_at >= datetime.combine(start, time.min))
    if end is not None:
        query = query.filter(
            Appointment.starts_at < datetime.combine(end + timedelta(days=1), time.min)
        )
    if status:
        query = query.filter(Appointment.status == status.strip().lower())

    phone_digits = re.sub(r"\D", "", (phone or "").strip())
    if phone_digits and len(phone_digits) >= 7:
        # Digit match ignores formatting; scan recent rows (no date required for phone link).
        fetch_cap = max((offset + limit) * 8, 200)
        candidates = (
            query.join(Customer)
            .order_by(Appointment.starts_at.desc())
            .limit(fetch_cap)
            .all()
        )
        matched = [
            row
            for row in candidates
            if phone_digits in re.sub(r"\D", "", (row.customer.phone if row.customer else "") or "")
        ]
        return matched[offset : offset + limit], len(matched)

    if q:
        like = f"%{q.strip()}%"
        dig = re.sub(r"\D", "", q.strip())
        query = query.join(Customer).filter(
            or_(
                Customer.name.ilike(like),
                Customer.phone.ilike(like),
                Customer.address.ilike(like),
                Appointment.appliance.ilike(like),
                Appointment.issue.ilike(like),
            )
        )
        ordered = query.order_by(Appointment.starts_at.desc())
        if len(dig) >= 7:
            fetch_cap = max((offset + limit) * 3, limit * 3, 120)
            rows = ordered.limit(fetch_cap).all()
            digit_hits = [
                row
                for row in rows
                if dig in re.sub(r"\D", "", (row.customer.phone if row.customer else "") or "")
            ]
            if digit_hits:
                return digit_hits[offset : offset + limit], len(digit_hits)
            return rows[offset : offset + limit], len(rows)
        total = ordered.count()
        return ordered.offset(offset).limit(limit).all(), total

    ordered = query.order_by(Appointment.starts_at.desc())
    total = ordered.count()
    return ordered.offset(offset).limit(limit).all(), total


def _xlsx_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/appointments/history", response_model=AppointmentHistoryPage)
def list_appointment_history(
    status: Optional[str] = Query(None, description="completed | cancelled | scheduled | confirmed"),
    q: Optional[str] = Query(None, min_length=1),
    phone: Optional[str] = Query(None, description="Match appointments by customer phone digits"),
    mode: str = Query("past", description="past | recent"),
    limit: int = Query(20, ge=1, le=300),
    offset: Optional[int] = Query(None, ge=0, description="Row offset (preferred with limit)"),
    page: Optional[int] = Query(None, ge=1, description="1-based page; used if offset omitted"),
    start: Optional[date] = Query(None, description="Inclusive start day (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="Inclusive end day (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    if offset is None:
        offset = ((page or 1) - 1) * limit
    rows, total = _query_appointment_history(
        db,
        status=status,
        q=q,
        phone=phone,
        mode=mode,
        limit=limit,
        offset=offset,
        start=start,
        end=end,
    )
    return AppointmentHistoryPage(
        items=[_serialize_appointment(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.get("/api/export/past.xlsx")
@app.get("/api/export/history.xlsx")
def export_past_xlsx(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None, min_length=1),
    limit: int = Query(5000, ge=1, le=10000),
    start: Optional[date] = Query(None, description="Inclusive start day (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="Inclusive end day (YYYY-MM-DD)"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Export booking fields for history appointments (spreadsheet sync)."""
    rows, _total = _query_appointment_history(
        db, status=status, q=q, mode="past", limit=limit, offset=0, start=start, end=end
    )
    # Staff: only their linked barber’s rows.
    if not _user_is_admin(user):
        linked = getattr(user, "technician_id", None)
        if linked is None:
            rows = []
        else:
            rows = [r for r in rows if int(r.technician_id) == int(linked)]
    stamp = date.today().isoformat()
    return _xlsx_response(
        build_past_workbook(rows), f"exclusive-studio-history-{stamp}.xlsx"
    )


@app.post("/api/import/history")
async def import_history_spreadsheet(
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Import appointments from .xlsx / .csv (same columns as History → Export)."""
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8 MB)")

    parse_errors, parsed = rows_from_workbook_bytes(raw, file.filename or "")
    if not parsed and parse_errors:
        raise HTTPException(400, parse_errors[0])

    techs = {
        (t.name or "").strip().lower(): t
        for t in db.query(Technician).filter(Technician.active == 1).all()
    }
    if not techs:
        raise HTTPException(400, "No active barbers to assign imports to")

    linked = getattr(user, "technician_id", None)
    linked_tech = None
    if linked is not None:
        linked_tech = db.query(Technician).filter(Technician.id == linked).first()
    admin = _user_is_admin(user)
    if not admin and linked_tech is None:
        raise HTTPException(403, "Your login is not linked to a barber profile")

    created = 0
    skipped = 0
    row_errors: List[str] = list(parse_errors)

    for item in parsed:
        barber_name = (item.get("barber") or "").strip()
        if admin:
            tech = techs.get(barber_name.lower()) if barber_name else None
            if tech is None:
                # Fall back to first active barber when column missing / unknown.
                tech = linked_tech or next(iter(techs.values()))
                if barber_name and barber_name.lower() not in techs:
                    row_errors.append(
                        f"Row {item['row_num']}: unknown barber {barber_name!r} — used {tech.name}."
                    )
        else:
            tech = linked_tech

        phone = re.sub(r"\s+", " ", str(item.get("phone") or "")).strip() or "000-0000"
        phone_digits = re.sub(r"\D", "", phone)
        customer = None
        if phone_digits and len(phone_digits) >= 7:
            candidates = db.query(Customer).filter(Customer.phone.isnot(None)).all()
            for c in candidates:
                if phone_digits in re.sub(r"\D", "", c.phone or ""):
                    customer = c
                    break
        if customer is None:
            customer = Customer(
                name=str(item.get("customer") or "Imported customer")[:120],
                phone=phone[:30],
                email=(item.get("email") or None),
                address=str(item.get("address") or "Shop")[:255],
                notes=item.get("customer_notes") or None,
            )
            db.add(customer)
            db.flush()
        else:
            # Refresh contact fields when provided.
            if item.get("customer"):
                customer.name = str(item["customer"])[:120]
            if item.get("email"):
                customer.email = str(item["email"])[:255]
            if item.get("address"):
                customer.address = str(item["address"])[:255]
            if item.get("customer_notes"):
                customer.notes = str(item["customer_notes"])

        starts = item["starts_at"]
        # Skip exact duplicates (same barber + start + phone).
        existing = (
            db.query(Appointment)
            .filter(
                Appointment.technician_id == tech.id,
                Appointment.starts_at == starts,
                Appointment.customer_id == customer.id,
            )
            .first()
        )
        if existing:
            skipped += 1
            continue

        db.add(
            Appointment(
                customer_id=customer.id,
                technician_id=tech.id,
                starts_at=starts,
                duration_minutes=int(item.get("duration") or 30),
                travel_buffer_minutes=int(item.get("travel") or 0),
                appliance=str(item.get("service") or "Haircut")[:80],
                job_type=str(item.get("job_type") or "Haircut")[:40],
                issue=str(item.get("issue") or "Imported")[:2000],
                status=str(item.get("status") or "completed")[:30],
                notes=item.get("notes") or None,
            )
        )
        created += 1

    db.commit()
    return {
        "ok": True,
        "created": created,
        "skipped": skipped,
        "errors": row_errors[:40],
        "error_count": len(row_errors),
    }


@app.get("/api/export/invoices.xlsx")
def export_invoices_xlsx(
    q: Optional[str] = Query(None, min_length=1),
    limit: int = Query(60, ge=1, le=300),
    job_id: Optional[int] = Query(None),
    start: Optional[date] = Query(None, description="Inclusive start day (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="Inclusive end day (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    jobs, _total = _query_appointment_history(
        db, q=q, mode="recent", limit=limit, offset=0, start=start, end=end
    )
    current = None
    if job_id is not None:
        current = (
            db.query(Appointment)
            .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
            .filter(Appointment.id == job_id)
            .first()
        )
        if not current:
            raise HTTPException(404, "Appointment not found")
    stamp = date.today().isoformat()
    return _xlsx_response(
        build_invoice_workbook(jobs, current_job=current),
        f"repair-desk-invoices-{stamp}.xlsx",
    )


@app.post("/api/export/invoices.xlsx")
def export_invoices_xlsx_post(payload: InvoiceExportBody, db: Session = Depends(get_db)):
    jobs, _total = _query_appointment_history(
        db,
        q=payload.q,
        mode="recent",
        limit=payload.limit,
        offset=0,
        start=payload.start,
        end=payload.end,
    )
    current = None
    lines = None
    if payload.job_id is not None:
        current = (
            db.query(Appointment)
            .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
            .filter(Appointment.id == payload.job_id)
            .first()
        )
        if not current:
            raise HTTPException(404, "Appointment not found")
        if payload.lines is not None:
            lines = [line.model_dump() for line in payload.lines]
    stamp = date.today().isoformat()
    return _xlsx_response(
        build_invoice_workbook(
            jobs,
            current_job=current,
            lines=lines,
            tax_rate=payload.tax_rate,
            notes=payload.notes,
            invoice_number=payload.invoice_number,
            invoice_date=payload.invoice_date,
        ),
        f"repair-desk-invoices-{stamp}.xlsx",
    )


def _invoice_document_context(payload: InvoiceDocumentBody) -> dict:
    brand = (
        (payload.business_name or "").strip()
        or os.getenv("BUSINESS_NAME", "Barber Shop").strip()
        or "Barber Shop"
    )
    lang = (payload.language or "en").strip() or "en"
    lines = [line.model_dump() for line in payload.lines]
    return {
        "business_name": brand,
        "invoice_number": (payload.invoice_number or "").strip(),
        "invoice_date": (payload.invoice_date or "").strip(),
        "customer_name": (payload.customer_name or "").strip(),
        "customer_phone": (payload.customer_phone or "").strip(),
        "customer_email": (payload.customer_email or "").strip(),
        "customer_address": (payload.customer_address or "").strip(),
        "job_summary": (payload.job_summary or "").strip(),
        "technician_name": (payload.technician_name or "").strip(),
        "lines": lines,
        "tax_rate": payload.tax_rate,
        "notes": (payload.notes or "").strip(),
        "language": lang,
    }


def _invoice_share_context(payload: InvoiceShareBody) -> dict:
    return _invoice_document_context(payload)


def _pdf_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/invoice/send-sms")
def invoice_send_sms(payload: InvoiceShareBody):
    """Text a short invoice summary. Missing Twilio creds → ok=false, configured=false."""
    ctx = _invoice_share_context(payload)
    sms_ctx = {
        "business_name": ctx["business_name"],
        "invoice_number": ctx["invoice_number"],
        "customer_name": ctx["customer_name"],
        "job_summary": ctx["job_summary"],
        "lines": ctx["lines"],
        "tax_rate": ctx["tax_rate"],
        "notes": ctx["notes"],
        "language": ctx["language"],
    }
    body = build_invoice_summary(**sms_ctx, for_sms=True)
    return send_invoice_sms(to_phone=payload.to, body=body)


@app.post("/api/invoice/send-email")
def invoice_send_email_route(payload: InvoiceShareBody):
    """Email PDF invoice + short intro. Missing SendGrid → ok=false, configured=false."""
    ctx = _invoice_share_context(payload)
    filename = invoice_pdf_filename(ctx["invoice_number"])
    pdf_bytes = build_invoice_pdf(**ctx)
    text_body, html_body = build_invoice_email_intro(
        business_name=ctx["business_name"],
        invoice_number=ctx["invoice_number"],
        customer_name=ctx["customer_name"],
        job_summary=ctx["job_summary"],
        lines=ctx["lines"],
        tax_rate=ctx["tax_rate"],
        language=ctx["language"],
        pdf_filename=filename,
    )
    lang = ctx["language"]
    inv = ctx["invoice_number"] or "—"
    brand = ctx["business_name"]
    if str(lang).lower().startswith("es"):
        subject = f"{brand}: Factura {inv}"
    else:
        subject = f"{brand}: Invoice {inv}"
    return send_invoice_email(
        to_email=payload.to,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        pdf_bytes=pdf_bytes,
        pdf_filename=filename,
    )


@app.post("/api/export/invoice.pdf")
def export_invoice_pdf(payload: InvoiceDocumentBody):
    """Download a PDF of the invoice currently shown in the builder."""
    ctx = _invoice_document_context(payload)
    filename = invoice_pdf_filename(ctx["invoice_number"])
    return _pdf_response(build_invoice_pdf(**ctx), filename)


def _invoice_line_subtotal(lines: list) -> float:
    subtotal = 0.0
    for line in lines:
        qty = float(getattr(line, "qty", 0) or 0)
        rate = float(getattr(line, "rate", 0) or 0)
        subtotal += qty * rate
    return subtotal


def _invoice_to_out(row: Invoice) -> InvoiceOut:
    try:
        raw = json.loads(row.lines_json or "[]")
    except json.JSONDecodeError:
        raw = []
    lines: list[InvoiceLineIn] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        kind = item.get("kind") or "service"
        if kind not in ("service", "material"):
            kind = "service"
        lines.append(
            InvoiceLineIn(
                description=str(item.get("description") or ""),
                qty=float(item.get("qty") or 0),
                rate=float(item.get("rate") or 0),
                kind=kind,
            )
        )
    return InvoiceOut(
        id=row.id,
        invoice_number=row.invoice_number,
        invoice_date=row.invoice_date,
        appointment_id=row.appointment_id,
        customer_name=row.customer_name,
        customer_phone=row.customer_phone,
        customer_email=row.customer_email,
        customer_address=row.customer_address,
        job_summary=row.job_summary,
        technician_name=row.technician_name,
        notes=row.notes,
        tax_rate=float(row.tax_rate or 0),
        lines=lines,
        subtotal=float(row.subtotal or 0),
        tax_amount=float(row.tax_amount or 0),
        total=float(row.total or 0),
        mode=row.mode or "job",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# Placeholder dashes used in the empty invoice sheet UI.
_INVOICE_NUMBER_PLACEHOLDERS = frozenset({"", "—", "-", "–", "−"})


def _invoice_sequence_hint(number: str) -> Optional[int]:
    """Extract a sequence integer from a saved invoice number, if any.

    Canonical form ``RD-0042`` contributes 42. Other ``RD-*`` labels contribute a
    trailing integer only when it does not look like a YYYYMMDD date suffix
    (so ``RD-TEST-1`` → 1, but ``RD-1199-20261021`` is ignored). Non-RD labels
    like ``Template`` contribute nothing.
    """
    raw = (number or "").strip()
    if not raw:
        return None
    m = re.match(r"^RD-(\d+)$", raw, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if not re.match(r"^RD[\w.-]*", raw, re.IGNORECASE):
        return None
    m = re.search(r"(\d+)$", raw)
    if not m:
        return None
    digits = m.group(1)
    # Skip trailing calendar dates (YYYYMMDD).
    if len(digits) == 8 and digits.startswith(("19", "20")):
        return None
    return int(digits)


def _format_invoice_number(seq: int) -> str:
    n = max(1, int(seq))
    return f"RD-{n:04d}" if n < 10000 else f"RD-{n}"


def _compute_next_invoice_number(db: Session) -> str:
    """Next global sequential number: RD-0001, RD-0002, … (never renames existing)."""
    numbers = [row[0] for row in db.query(Invoice.invoice_number).all()]
    max_n = 0
    existing = set()
    for num in numbers:
        text = (num or "").strip()
        if text:
            existing.add(text.upper())
        hint = _invoice_sequence_hint(text)
        if hint is not None:
            max_n = max(max_n, hint)
    n = max_n + 1
    while True:
        candidate = _format_invoice_number(n)
        if candidate.upper() not in existing:
            return candidate
        n += 1


def _resolve_invoice_number(
    db: Session,
    payload: InvoiceSaveBody,
    *,
    is_new: bool,
    existing_number: Optional[str] = None,
) -> str:
    raw = (payload.invoice_number or "").strip()
    if raw and raw not in _INVOICE_NUMBER_PLACEHOLDERS:
        number = raw[:80]
    elif is_new:
        number = _compute_next_invoice_number(db)
    else:
        kept = (existing_number or "").strip()
        number = kept[:80] if kept else _compute_next_invoice_number(db)
    # Avoid collisions when two new sheets both prefetched the same next number.
    if is_new:
        taken = (
            db.query(Invoice.id)
            .filter(Invoice.invoice_number == number)
            .first()
        )
        if taken:
            return _compute_next_invoice_number(db)
    return number


def _apply_invoice_payload(
    row: Invoice,
    payload: InvoiceSaveBody,
    *,
    db: Session,
    is_new: bool,
) -> None:
    lines = list(payload.lines or [])
    subtotal = _invoice_line_subtotal(lines)
    tax_rate = float(payload.tax_rate or 0)
    tax_amount = subtotal * (tax_rate / 100.0)
    total = subtotal + tax_amount
    number = _resolve_invoice_number(
        db, payload, is_new=is_new, existing_number=row.invoice_number
    )
    row.invoice_number = number[:80]
    row.invoice_date = (payload.invoice_date or "").strip() or None
    row.appointment_id = payload.appointment_id
    row.customer_name = (payload.customer_name or "").strip() or None
    row.customer_phone = (payload.customer_phone or "").strip() or None
    row.customer_email = (payload.customer_email or "").strip() or None
    row.customer_address = (payload.customer_address or "").strip() or None
    row.job_summary = (payload.job_summary or "").strip() or None
    row.technician_name = (payload.technician_name or "").strip() or None
    row.notes = (payload.notes or "").strip() or None
    row.tax_rate = tax_rate
    row.lines_json = json.dumps([line.model_dump() for line in lines], ensure_ascii=False)
    row.subtotal = round(subtotal, 2)
    row.tax_amount = round(tax_amount, 2)
    row.total = round(total, 2)
    row.mode = payload.mode if payload.mode in ("job", "manual") else "job"
    row.updated_at = datetime.utcnow()


@app.get("/api/invoices", response_model=List[InvoiceOut])
def list_invoices(
    limit: int = Query(40, ge=1, le=200),
    appointment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Invoice)
    if appointment_id is not None:
        q = q.filter(Invoice.appointment_id == appointment_id)
    rows = (
        q.order_by(Invoice.updated_at.desc(), Invoice.id.desc())
        .limit(limit)
        .all()
    )
    return [_invoice_to_out(row) for row in rows]


@app.get("/api/invoices/next-number", response_model=NextInvoiceNumberOut)
def get_next_invoice_number(db: Session = Depends(get_db)):
    """Return the next sequential invoice number without creating a row."""
    return NextInvoiceNumberOut(invoice_number=_compute_next_invoice_number(db))


@app.get("/api/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    row = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not row:
        raise HTTPException(404, "Invoice not found")
    return _invoice_to_out(row)


@app.post("/api/invoices", response_model=InvoiceOut)
def save_invoice(payload: InvoiceSaveBody, db: Session = Depends(get_db)):
    """Create a new invoice, or update when ``id`` is provided."""
    if payload.appointment_id is not None:
        exists = (
            db.query(Appointment.id).filter(Appointment.id == payload.appointment_id).first()
        )
        if not exists:
            raise HTTPException(404, "Linked appointment not found")

    row: Optional[Invoice] = None
    is_new = False
    if payload.id is not None:
        row = db.query(Invoice).filter(Invoice.id == payload.id).first()
        if not row:
            raise HTTPException(404, "Invoice not found")
    else:
        is_new = True
        row = Invoice()
        row.created_at = datetime.utcnow()
        db.add(row)

    _apply_invoice_payload(row, payload, db=db, is_new=is_new)
    db.commit()
    db.refresh(row)
    return _invoice_to_out(row)


@app.get("/api/appointments/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appt:
        raise HTTPException(404, "Appointment not found")
    return _serialize_appointment(appt)


def _compute_slots(
    db: Session,
    *,
    day: date,
    duration_minutes: int,
    travel_buffer_minutes: int,
    technician_id: Optional[int] = None,
    ignore_appointment_id: Optional[int] = None,
) -> List[dict]:
    techs_q = db.query(Technician).filter(Technician.active == 1)
    if technician_id:
        techs_q = techs_q.filter(Technician.id == technician_id)
    techs = techs_q.order_by(*_tech_list_order()).all()

    day_start, day_end = calendar_day_bounds(day)
    appts = (
        db.query(Appointment)
        .filter(
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
            Appointment.status != "cancelled",
        )
        .all()
    )
    by_tech: Dict[int, List[Appointment]] = {t.id: [] for t in techs}
    for a in appts:
        by_tech.setdefault(a.technician_id, []).append(a)

    blocks_by_tech = _blocks_for_techs(db, [t.id for t in techs], day)

    return suggest_slots(
        day,
        techs,
        by_tech,
        duration_minutes,
        travel_buffer_minutes,
        ignore_id=ignore_appointment_id,
        blocks_by_tech=blocks_by_tech,
    )


@app.get("/api/slots", response_model=List[SlotSuggestion])
def get_slots(
    day: date = Query(...),
    duration_minutes: int = Query(DEFAULT_JOB_DURATION, ge=15, le=240),
    travel_buffer_minutes: int = Query(DEFAULT_TRAVEL_BUFFER, ge=0, le=120),
    technician_id: Optional[int] = None,
    ignore_appointment_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return _compute_slots(
        db,
        day=day,
        duration_minutes=duration_minutes,
        travel_buffer_minutes=travel_buffer_minutes,
        technician_id=technician_id,
        ignore_appointment_id=ignore_appointment_id,
    )


@app.get("/api/public/slots", response_model=List[SlotSuggestion])
def public_get_slots(
    request: Request,
    day: date = Query(...),
    duration_minutes: int = Query(DEFAULT_JOB_DURATION, ge=15, le=240),
    travel_buffer_minutes: int = Query(DEFAULT_TRAVEL_BUFFER, ge=0, le=120),
    technician_id: Optional[int] = None,
    address: str = Query("", min_length=0),
    db: Session = Depends(get_db),
):
    """Customer booking — one nearest tech per time; tech names redacted."""
    _rate_limit(request, "public_slots", limit=60, window_sec=60)
    # Do not allow ignore_appointment_id on the public surface.
    slots = _compute_slots(
        db,
        day=day,
        duration_minutes=duration_minutes,
        travel_buffer_minutes=travel_buffer_minutes,
        technician_id=technician_id,
    )

    techs_q = db.query(Technician).filter(Technician.active == 1)
    if technician_id:
        techs_q = techs_q.filter(Technician.id == technician_id)
    techs = techs_q.all()
    techs_by_id = {t.id: t for t in techs}

    day_start, day_end = calendar_day_bounds(day)
    appts = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer))
        .filter(
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
            Appointment.status != "cancelled",
        )
        .all()
    )
    by_tech: Dict[int, List[Appointment]] = {t.id: [] for t in techs}
    for a in appts:
        by_tech.setdefault(a.technician_id, []).append(a)

    return collapse_slots_nearest_tech(
        slots,
        address=address or "",
        techs_by_id=techs_by_id,
        day_jobs_by_tech=by_tech,
        hide_technician_name=True,
    )


def _require_create_fields(payload: AppointmentCreate) -> None:
    """Reject incomplete bookings with a clear 400 detail (not only schema 422)."""
    missing: List[str] = []
    if not (payload.customer_phone or "").strip():
        missing.append("phone number")
    elif len(re.sub(r"\D", "", payload.customer_phone)) < 7:
        raise HTTPException(400, "Phone number is required (at least 7 digits).")
    if not (payload.customer_name or "").strip():
        missing.append("name")
    if not (payload.customer_address or "").strip():
        missing.append("address")
    if not (payload.appliance or "").strip():
        missing.append("appliance")
    if not (payload.job_type or "").strip():
        missing.append("job type")
    if not (payload.issue or "").strip():
        missing.append("issue")
    if not payload.technician_id or int(payload.technician_id) <= 0:
        missing.append("technician")
    if not payload.starts_at:
        missing.append("time slot")
    if missing:
        if len(missing) == 1:
            raise HTTPException(400, f"{missing[0].capitalize()} is required.")
        raise HTTPException(
            400,
            "Missing required fields: " + ", ".join(missing) + ".",
        )


@app.get("/api/suggest-tech", response_model=Optional[TechSuggestOut])
def suggest_tech(
    day: date = Query(...),
    address: str = Query("", min_length=0),
    db: Session = Depends(get_db),
):
    if not address_ready_for_suggest(address):
        return None
    techs = (
        db.query(Technician)
        .filter(Technician.active == 1)
        .order_by(*_tech_list_order())
        .all()
    )
    if not techs:
        return None
    day_start, day_end = day_bounds(day)
    appts = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer))
        .filter(
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
            Appointment.status != "cancelled",
        )
        .all()
    )
    by_tech: Dict[int, List[Appointment]] = {t.id: [] for t in techs}
    for a in appts:
        by_tech.setdefault(a.technician_id, []).append(a)
    suggestion = suggest_technician(
        address=address,
        active_techs=techs,
        day_jobs_by_tech=by_tech,
    )
    return suggestion


def _create_appointment_core(
    payload: AppointmentCreate, db: Session, *, force_status: Optional[str] = None
) -> AppointmentOut:
    """Shared create path for staff and public booking (same validation + SMS)."""
    _require_create_fields(payload)

    tech = db.query(Technician).filter(Technician.id == payload.technician_id).first()
    if not tech:
        raise HTTPException(400, "Technician is required.")
    if not tech.active:
        raise HTTPException(400, "That technician is inactive")

    day = payload.starts_at.date()
    work_start, work_end = _assert_tech_schedulable(tech, day, db)
    cal_start, cal_end = calendar_day_bounds(day)
    day_blocks = _blocks_for_techs(db, [tech.id], day).get(tech.id, [])
    ends_at = payload.starts_at + timedelta(minutes=payload.duration_minutes)
    hour_block = slot_blocked_by_blocks(payload.starts_at, ends_at, day_blocks)
    if hour_block:
        raise HTTPException(409, f"That slot overlaps blocked time ({hour_block}).")
    existing = (
        db.query(Appointment)
        .filter(
            Appointment.technician_id == payload.technician_id,
            Appointment.starts_at >= cal_start,
            Appointment.starts_at < cal_end,
            Appointment.status != "cancelled",
        )
        .all()
    )
    if not appointment_fits(
        payload.starts_at,
        payload.duration_minutes,
        payload.travel_buffer_minutes,
        existing,
        day_start=work_start,
        day_end=work_end,
        tech_blocks=day_blocks,
    ):
        raise HTTPException(
            409,
            "That slot conflicts with another job or travel time for this technician.",
        )

    phone = payload.customer_phone.strip()
    email = (payload.customer_email or "").strip() or None
    name = payload.customer_name.strip()
    address = payload.customer_address.strip()
    appliance = payload.appliance.strip()
    job_type = (payload.job_type or "").strip()
    issue = payload.issue.strip()
    if not job_type:
        raise HTTPException(400, "Job Type is required.")

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if customer:
        customer.name = name
        customer.address = address
        customer.email = email
        if payload.customer_notes is not None:
            customer.notes = payload.customer_notes
    else:
        customer = Customer(
            name=name,
            phone=phone,
            email=email,
            address=address,
            notes=payload.customer_notes,
        )
        db.add(customer)
        db.flush()

    status = force_status or payload.status or "scheduled"
    appt = Appointment(
        customer_id=customer.id,
        technician_id=payload.technician_id,
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        travel_buffer_minutes=payload.travel_buffer_minutes,
        appliance=appliance,
        job_type=job_type,
        issue=issue,
        notes=payload.notes,
        status=status,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    appt = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.customer),
            joinedload(Appointment.technician).joinedload(Technician.user),
        )
        .filter(Appointment.id == appt.id)
        .one()
    )
    # Notifications never roll back the booking (see app/booking_notify.py).
    tech_user = appt.technician.user if appt.technician else None
    try:
        notify_booking_created(
            appt=appt,
            customer_phone=appt.customer.phone if appt.customer else phone,
            customer_email=(appt.customer.email if appt.customer else None) or email,
            customer_name=appt.customer.name if appt.customer else name,
            business_name=(payload.business_name or "").strip() or BUSINESS_NAME or "Barber Shop",
            language=(payload.language or "en").strip() or "en",
            barber_phone=getattr(tech_user, "phone", None) if tech_user else None,
            barber_email=getattr(tech_user, "email", None) if tech_user else None,
        )
    except Exception:
        # Extra guard — notify_booking_created already swallows errors.
        pass
    return _serialize_appointment(appt)


@app.post("/api/appointments", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    return _create_appointment_core(payload, db)


@app.post("/api/public/appointments", response_model=AppointmentOut)
def public_create_appointment(
    payload: AppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Customer booking site — same create/SMS as staff; rate-limited; status forced."""
    _rate_limit(request, "public_book", limit=8, window_sec=3600)
    return _create_appointment_core(payload, db, force_status="scheduled")


@app.post("/api/public/book", response_model=AppointmentOut)
def public_book_appointment(
    payload: PublicBookCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Square-style customer checkout: services + barber + time → appointment."""
    _rate_limit(request, "public_book", limit=8, window_sec=3600)
    ensure_services(db)
    db.commit()

    services = (
        db.query(Service)
        .filter(Service.id.in_(set(payload.service_ids)), Service.active == 1)
        .all()
    )
    by_id = {s.id: s for s in services}
    ordered = [by_id[i] for i in payload.service_ids if i in by_id]
    if not ordered:
        raise HTTPException(400, "Select at least one service.")
    if len(ordered) != len(payload.service_ids):
        raise HTTPException(400, "One or more services are unavailable.")

    duration = sum(s.duration_minutes for s in ordered)
    primary = ordered[0]
    # Collapse quantities for display: "Haircut ×2, Beard"
    labels: list[str] = []
    seen: dict[int, int] = {}
    order_ids: list[int] = []
    for s in ordered:
        if s.id not in seen:
            order_ids.append(s.id)
            seen[s.id] = 0
        seen[s.id] += 1
    for sid in order_ids:
        s = by_id[sid]
        q = seen[sid]
        labels.append(f"{s.name} ×{q}" if q > 1 else s.name)
    service_names = ", ".join(labels)
    issue_bits = [primary.description or primary.name]
    extras_labels = labels[1:]
    if extras_labels:
        issue_bits.append("Add-ons: " + ", ".join(extras_labels))
    issue = " · ".join(issue_bits)

    first = payload.customer_first_name.strip()
    last = payload.customer_last_name.strip()
    full_name = f"{first} {last}".strip()
    notes = (payload.notes or "").strip() or None
    if payload.marketing_opt_in:
        marketing = "Marketing SMS: opted in"
        notes = f"{notes}\n{marketing}".strip() if notes else marketing

    create_payload = AppointmentCreate(
        customer_name=full_name,
        customer_phone=payload.customer_phone.strip(),
        customer_email=(payload.customer_email or "").strip() or None,
        customer_address=SHOP_ADDRESS,
        customer_notes=None,
        technician_id=payload.technician_id,
        starts_at=payload.starts_at,
        duration_minutes=max(15, duration),
        travel_buffer_minutes=0,
        appliance=service_names[:80],
        job_type="Service",
        issue=issue[:2000] or primary.name,
        notes=notes,
        status="scheduled",
        language=payload.language,
        business_name=(payload.business_name or "").strip() or BUSINESS_NAME,
    )
    return _create_appointment_core(create_payload, db, force_status="scheduled")


def _phone_digits(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


def _last_name_key(full_name: str) -> str:
    parts = [p for p in re.split(r"\s+", (full_name or "").strip()) if p]
    last = parts[-1] if parts else ""
    return re.sub(r"[^A-Za-z]", "", last).upper()


@app.post("/api/public/lookup-booking", response_model=List[PublicBookingOut])
def public_lookup_booking(
    payload: PublicBookingLookup,
    request: Request,
    db: Session = Depends(get_db),
):
    """Find upcoming bookings by phone + first 4 letters of last name.

    Filter: ``starts_at >= now`` (naive local clock) and status not cancelled/canceled.
    Past slots from earlier today are excluded.
    """
    _rate_limit(request, "public_lookup", limit=20, window_sec=3600)

    phone = _phone_digits(payload.phone)
    prefix = re.sub(r"[^A-Za-z]", "", (payload.last_name_prefix or "")).upper()[:4]
    if len(phone) < 7 or len(prefix) < 1:
        raise HTTPException(400, "Enter a valid phone number and last-name letters.")

    # Match on last 10 digits when possible (US numbers with/without country code).
    phone_tail = phone[-10:] if len(phone) >= 10 else phone

    now = datetime.now().replace(microsecond=0)
    cancelled = {"cancelled", "canceled"}
    rows = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.starts_at >= now)
        .order_by(Appointment.starts_at.asc())
        .limit(300)
        .all()
    )

    matches: list[PublicBookingOut] = []
    for appt in rows:
        # Belt-and-suspenders: skip past / cancelled even if DB compare is odd.
        starts = appt.starts_at
        if starts is None or starts < now:
            continue
        status = (appt.status or "").strip().lower()
        if status in cancelled:
            continue
        cust = appt.customer
        if not cust:
            continue
        digits = _phone_digits(cust.phone)
        if not digits:
            continue
        stored_tail = digits[-10:] if len(digits) >= 10 else digits
        if stored_tail != phone_tail and digits != phone:
            continue
        last_key = _last_name_key(cust.name)
        if not last_key.startswith(prefix):
            continue
        name_parts = [p for p in re.split(r"\s+", (cust.name or "").strip()) if p]
        matches.append(
            PublicBookingOut(
                id=appt.id,
                service=appt.appliance or "Appointment",
                starts_at=appt.starts_at,
                ends_at=appt.starts_at + timedelta(minutes=appt.duration_minutes or 30),
                duration_minutes=appt.duration_minutes,
                status=appt.status,
                barber_name=appt.technician.name if appt.technician else None,
                barber_id=appt.technician_id,
                customer_first_name=name_parts[0] if name_parts else None,
            )
        )
        if len(matches) >= 10:
            break

    return matches


def _public_verified_appointment(
    db: Session,
    appointment_id: int,
    phone: str,
    last_name_prefix: str,
) -> Appointment:
    """Load an upcoming appointment owned by phone + last-name prefix."""
    phone_digits = _phone_digits(phone)
    prefix = re.sub(r"[^A-Za-z]", "", last_name_prefix or "").upper()[:4]
    if len(phone_digits) < 7 or len(prefix) < 1:
        raise HTTPException(400, "Enter a valid phone number and last-name letters.")

    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appt or not appt.customer:
        raise HTTPException(404, "Booking not found.")

    status = (appt.status or "").strip().lower()
    if status in {"cancelled", "canceled"}:
        raise HTTPException(404, "This booking was already cancelled.")

    now = datetime.now().replace(microsecond=0)
    if appt.starts_at is None or appt.starts_at < now:
        raise HTTPException(400, "Past bookings cannot be changed.")

    digits = _phone_digits(appt.customer.phone)
    phone_tail = phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits
    stored_tail = digits[-10:] if len(digits) >= 10 else digits
    if stored_tail != phone_tail and digits != phone_digits:
        raise HTTPException(403, "Phone number does not match this booking.")
    if not _last_name_key(appt.customer.name).startswith(prefix):
        raise HTTPException(403, "Last name does not match this booking.")
    return appt


@app.post("/api/public/cancel-booking")
def public_cancel_booking(
    payload: PublicBookingVerify,
    request: Request,
    db: Session = Depends(get_db),
):
    """Customer cancel — frees the slot; keeps history as cancelled."""
    _rate_limit(request, "public_cancel", limit=15, window_sec=3600)
    appt = _public_verified_appointment(
        db, payload.appointment_id, payload.phone, payload.last_name_prefix
    )
    appt.status = "cancelled"
    db.commit()
    return {"ok": True, "id": appt.id, "status": "cancelled"}


@app.post("/api/public/reschedule-booking", response_model=AppointmentOut)
def public_reschedule_booking(
    payload: PublicReschedule,
    request: Request,
    db: Session = Depends(get_db),
):
    """Customer reschedule — same service/duration, new barber + start time."""
    _rate_limit(request, "public_reschedule", limit=15, window_sec=3600)
    appt = _public_verified_appointment(
        db, payload.appointment_id, payload.phone, payload.last_name_prefix
    )

    tech = db.query(Technician).filter(Technician.id == payload.technician_id).first()
    if not tech or not tech.active:
        raise HTTPException(400, "That barber is unavailable.")

    starts = payload.starts_at.replace(second=0, microsecond=0)
    duration = max(15, appt.duration_minutes or 30)
    day = starts.date()
    work_start, work_end = _assert_tech_schedulable(tech, day, db)
    cal_start, cal_end = calendar_day_bounds(day)
    day_blocks = _blocks_for_techs(db, [tech.id], day).get(tech.id, [])
    ends_at = starts + timedelta(minutes=duration)
    hour_block = slot_blocked_by_blocks(starts, ends_at, day_blocks)
    if hour_block:
        raise HTTPException(409, f"That time overlaps blocked time ({hour_block}).")

    existing = (
        db.query(Appointment)
        .filter(
            Appointment.technician_id == tech.id,
            Appointment.starts_at >= cal_start,
            Appointment.starts_at < cal_end,
            Appointment.status != "cancelled",
            Appointment.id != appt.id,
        )
        .all()
    )
    if not appointment_fits(
        starts,
        duration,
        appt.travel_buffer_minutes or 0,
        existing,
        day_start=work_start,
        day_end=work_end,
        ignore_id=appt.id,
        tech_blocks=day_blocks,
    ):
        raise HTTPException(409, "That time is no longer available. Pick another slot.")

    appt.technician_id = tech.id
    appt.starts_at = starts
    appt.status = "scheduled"
    db.commit()
    db.refresh(appt)
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.id == appt.id)
        .one()
    )
    return _serialize_appointment(appt)


@app.patch("/api/appointments/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
):
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appt:
        raise HTTPException(404, "Appointment not found")

    data = payload.model_dump(exclude_unset=True)
    if "customer_name" in data:
        appt.customer.name = data.pop("customer_name").strip()
    if "customer_phone" in data:
        appt.customer.phone = data.pop("customer_phone").strip()
    if "customer_email" in data:
        raw_email = data.pop("customer_email")
        appt.customer.email = (raw_email or "").strip() or None
    if "customer_address" in data:
        appt.customer.address = data.pop("customer_address").strip()
    if "customer_notes" in data:
        appt.customer.notes = data.pop("customer_notes")

    if "technician_id" in data:
        tech = db.query(Technician).filter(Technician.id == data["technician_id"]).first()
        if not tech:
            raise HTTPException(404, "Technician not found")
        if not tech.active:
            raise HTTPException(400, "That technician is inactive")

    for key, value in data.items():
        if isinstance(value, str) and key in {"appliance", "issue", "job_type"}:
            value = value.strip()
            if key == "job_type" and not value:
                value = "Repair"
        setattr(appt, key, value)

    if appt.status != "cancelled":
        day = appt.starts_at.date()
        tech = (
            db.query(Technician).filter(Technician.id == appt.technician_id).first()
        )
        if not tech:
            db.rollback()
            raise HTTPException(404, "Technician not found")
        work_start, work_end = _assert_tech_schedulable(tech, day, db)
        cal_start, cal_end = calendar_day_bounds(day)
        day_blocks = _blocks_for_techs(db, [tech.id], day).get(tech.id, [])
        ends_at = appt.starts_at + timedelta(minutes=appt.duration_minutes)
        hour_block = slot_blocked_by_blocks(appt.starts_at, ends_at, day_blocks)
        if hour_block:
            db.rollback()
            raise HTTPException(
                409, f"Updated time overlaps blocked time ({hour_block})."
            )
        existing = (
            db.query(Appointment)
            .filter(
                Appointment.technician_id == appt.technician_id,
                Appointment.starts_at >= cal_start,
                Appointment.starts_at < cal_end,
                Appointment.status != "cancelled",
            )
            .all()
        )
        if not appointment_fits(
            appt.starts_at,
            appt.duration_minutes,
            appt.travel_buffer_minutes,
            existing,
            day_start=work_start,
            day_end=work_end,
            ignore_id=appt.id,
            tech_blocks=day_blocks,
        ):
            db.rollback()
            raise HTTPException(
                409,
                "Updated time conflicts with another job or travel time.",
            )

    db.commit()
    db.refresh(appt)
    appt = (
        db.query(Appointment)
        .options(joinedload(Appointment.customer), joinedload(Appointment.technician))
        .filter(Appointment.id == appt.id)
        .one()
    )
    return _serialize_appointment(appt)


@app.delete("/api/appointments/{appointment_id}")
def cancel_or_delete_appointment(
    appointment_id: int,
    permanent: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Cancel by default (status=cancelled) so the slot is free but history remains.

    Pass permanent=true to hard-delete the row. Cancelled and deleted jobs are
    excluded from board/slot/conflict queries, so both free the technician's time.
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    if permanent:
        db.delete(appt)
        db.commit()
        return {"ok": True, "deleted": True}
    appt.status = "cancelled"
    db.commit()
    return {"ok": True, "deleted": False}
