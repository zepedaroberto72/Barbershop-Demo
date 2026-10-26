from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

JOB_TYPES = (
    "Diagnose",
    "Repair",
    "Replacement",
    "Follow-up",
    "Other",
)

# Default booking duration (minutes) per job type — keep in sync with static/app.js.
JOB_TYPE_DEFAULT_DURATION = {
    "Diagnose": 60,
    "Repair": 120,
    "Replacement": 60,
    "Follow-up": 60,
    "Other": 60,
}


def default_duration_for_job_type(job_type: str) -> int:
    return JOB_TYPE_DEFAULT_DURATION.get(job_type, JOB_TYPE_DEFAULT_DURATION["Repair"])


class TechnicianOut(BaseModel):
    id: int
    name: str
    color: str
    start_location: str
    active: int = 1
    sort_order: int = 0
    work_start: str = "08:00"
    work_end: str = "18:00"
    work_days: str = "1,2,3,4,5"

    class Config:
        from_attributes = True


class TechnicianCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#0D9488", min_length=4, max_length=20)
    start_location: str = Field(default="Shop", min_length=1, max_length=255)
    work_start: str = Field(default="08:00", min_length=4, max_length=5)
    work_end: str = Field(default="18:00", min_length=4, max_length=5)
    work_days: str = Field(default="1,2,3,4,5", min_length=1, max_length=32)


class TechnicianUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, min_length=4, max_length=20)
    start_location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    active: Optional[int] = None
    work_start: Optional[str] = Field(default=None, min_length=4, max_length=5)
    work_end: Optional[str] = Field(default=None, min_length=4, max_length=5)
    work_days: Optional[str] = Field(default=None, min_length=1, max_length=32)


class TechBlockOut(BaseModel):
    id: int
    technician_id: int
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class TechBlockCreate(BaseModel):
    """Create a blocked range. Optional ``span`` expands from ``start_date``:

    - ``hours`` — single day with ``start_time``…``end_time`` (required)
    - ``day`` — full calendar day
    - ``week`` — Mon–Sun containing ``start_date`` (full days)
    - ``month`` — full calendar month containing ``start_date``
    - omit — use ``start_date``…``end_date`` (end defaults to start)

    Omit times (or leave null) for full-day coverage on each date in the range.
    """

    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[str] = Field(default=None, max_length=5)
    end_time: Optional[str] = Field(default=None, max_length=5)
    reason: Optional[str] = Field(default=None, max_length=200)
    span: Optional[str] = Field(default=None, max_length=10)


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class AppointmentOut(BaseModel):
    id: int
    customer_id: int
    technician_id: int
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int
    travel_buffer_minutes: int
    appliance: str
    job_type: str
    issue: str
    status: str
    notes: Optional[str] = None
    customer: CustomerOut
    technician: TechnicianOut

    class Config:
        from_attributes = True


class AppointmentHistoryPage(BaseModel):
    """Paged history/recent appointments for History + Invoice browsers."""

    items: list[AppointmentOut]
    total: int
    limit: int
    offset: int


class AppointmentCreate(BaseModel):
    customer_name: str = Field(min_length=1)
    customer_phone: str = Field(min_length=7)
    customer_email: Optional[str] = None
    customer_address: str = Field(min_length=3)
    customer_notes: Optional[str] = None
    technician_id: int = Field(gt=0)
    starts_at: datetime
    duration_minutes: int = 120
    travel_buffer_minutes: int = 30
    appliance: str = Field(min_length=1)
    job_type: str = Field(default="Repair", min_length=1)
    issue: str = Field(min_length=1)
    notes: Optional[str] = None
    status: str = "scheduled"
    # Optional SMS hints from the UI (prefs language / brand); ignored if SMS skipped.
    language: Optional[str] = Field(default=None, max_length=8)
    business_name: Optional[str] = Field(default=None, max_length=60)


class ServiceOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price_cents: int
    sort_order: int = 0
    active: int = 1

    class Config:
        from_attributes = True


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    duration_minutes: int = Field(default=30, ge=5, le=480)
    price_cents: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)
    active: int = Field(default=1, ge=0, le=1)


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    duration_minutes: Optional[int] = Field(default=None, ge=5, le=480)
    price_cents: Optional[int] = Field(default=None, ge=0)
    sort_order: Optional[int] = Field(default=None, ge=0)
    active: Optional[int] = Field(default=None, ge=0, le=1)


class PublicBookCreate(BaseModel):
    """Customer /book checkout — maps onto AppointmentCreate for persistence."""

    customer_first_name: str = Field(min_length=1, max_length=60)
    customer_last_name: str = Field(min_length=1, max_length=60)
    customer_phone: str = Field(min_length=7, max_length=30)
    customer_email: Optional[str] = Field(default=None, max_length=255)
    service_ids: list[int] = Field(min_length=1)
    technician_id: int = Field(gt=0)
    starts_at: datetime
    notes: Optional[str] = Field(default=None, max_length=2000)
    marketing_opt_in: bool = False
    language: Optional[str] = Field(default=None, max_length=8)
    business_name: Optional[str] = Field(default=None, max_length=60)


class PublicBookingLookup(BaseModel):
    """My Booking — verify with phone + first 4 letters of last name."""

    phone: str = Field(min_length=7, max_length=30)
    last_name_prefix: str = Field(min_length=1, max_length=4)


class ShopSettingsOut(BaseModel):
    booking_hold_minutes: int = 10


class ShopSettingsUpdate(BaseModel):
    booking_hold_minutes: int = Field(ge=1, le=60)


class PublicBookingOut(BaseModel):
    """Limited upcoming appointment details for the customer lookup page."""

    id: int
    service: str
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int
    status: str
    barber_name: Optional[str] = None
    barber_id: Optional[int] = None
    customer_first_name: Optional[str] = None


class PublicBookingVerify(BaseModel):
    """Phone + last-name prefix gate for cancel / reschedule."""

    appointment_id: int = Field(gt=0)
    phone: str = Field(min_length=7, max_length=30)
    last_name_prefix: str = Field(min_length=1, max_length=4)


class PublicReschedule(PublicBookingVerify):
    """Customer reschedule — same services/duration, new barber + start time."""

    technician_id: int = Field(gt=0)
    starts_at: datetime


class TechSuggestOut(BaseModel):
    technician_id: int
    name: str
    reason: str
    city: Optional[str] = None


class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=1)
    customer_phone: Optional[str] = Field(default=None, min_length=7)
    customer_email: Optional[str] = None
    customer_address: Optional[str] = Field(default=None, min_length=3)
    customer_notes: Optional[str] = None
    technician_id: Optional[int] = None
    starts_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    travel_buffer_minutes: Optional[int] = None
    appliance: Optional[str] = None
    job_type: Optional[str] = None
    issue: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class SlotSuggestion(BaseModel):
    technician_id: int
    technician_name: str
    starts_at: datetime
    ends_at: datetime
    travel_buffer_minutes: int
    available: bool = True
    reason: Optional[str] = None


class AnalyticsCount(BaseModel):
    label: str
    count: int
    color: Optional[str] = None
    minutes: int = 0
    travel_minutes: int = 0


class AnalyticsDay(BaseModel):
    date: str
    label: str
    count: int
    job_minutes: int
    travel_minutes: int


class AnalyticsSummary(BaseModel):
    total_jobs: int
    active_jobs: int
    cancelled_jobs: int
    job_hours: float
    travel_hours: float
    booked_hours: float
    available_hours: float
    utilization_pct: float


class AnalyticsOut(BaseModel):
    start: str
    end: str
    summary: AnalyticsSummary
    by_day: list[AnalyticsDay]
    by_technician: list[AnalyticsCount]
    by_job_type: list[AnalyticsCount]
    by_appliance: list[AnalyticsCount]
    by_status: list[AnalyticsCount]


class InvoiceExportLine(BaseModel):
    description: str = ""
    qty: float = 0
    rate: float = 0
    kind: str = Field(default="service", pattern="^(service|material)$")


class InvoiceExportBody(BaseModel):
    q: Optional[str] = None
    limit: int = Field(default=60, ge=1, le=300)
    job_id: Optional[int] = None
    start: Optional[date] = None
    end: Optional[date] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    notes: Optional[str] = None
    tax_rate: float = 8.25
    lines: Optional[list[InvoiceExportLine]] = None


class InvoiceShareLine(BaseModel):
    description: str = ""
    qty: float = 0
    rate: float = 0
    kind: str = Field(default="service", pattern="^(service|material)$")


class InvoiceDocumentBody(BaseModel):
    """Current on-screen invoice fields (PDF export / email attachment source)."""

    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    job_summary: Optional[str] = None
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    tax_rate: float = 8.25
    lines: list[InvoiceShareLine] = Field(default_factory=list)
    business_name: Optional[str] = Field(default=None, max_length=60)
    language: Optional[str] = Field(default="en", max_length=8)


class InvoiceShareBody(InvoiceDocumentBody):
    """Shared payload for texting or emailing an invoice summary."""

    to: str = Field(..., min_length=1, max_length=200)


class InvoiceLineIn(BaseModel):
    description: str = ""
    qty: float = 0
    rate: float = 0
    kind: str = Field(default="service", pattern="^(service|material)$")


class InvoiceSaveBody(BaseModel):
    """Create or update a persisted invoice. Pass ``id`` to update."""

    id: Optional[int] = None
    invoice_number: Optional[str] = Field(default=None, max_length=80)
    invoice_date: Optional[str] = Field(default=None, max_length=80)
    appointment_id: Optional[int] = None
    customer_name: Optional[str] = Field(default=None, max_length=120)
    customer_phone: Optional[str] = Field(default=None, max_length=30)
    customer_email: Optional[str] = Field(default=None, max_length=255)
    customer_address: Optional[str] = Field(default=None, max_length=255)
    job_summary: Optional[str] = Field(default=None, max_length=255)
    technician_name: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None
    tax_rate: float = 8.25
    lines: list[InvoiceLineIn] = Field(default_factory=list)
    mode: str = Field(default="job", pattern="^(job|manual)$")


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    invoice_date: Optional[str] = None
    appointment_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    job_summary: Optional[str] = None
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    tax_rate: float = 8.25
    lines: list[InvoiceLineIn] = Field(default_factory=list)
    subtotal: float = 0
    tax_amount: float = 0
    total: float = 0
    mode: str = "job"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NextInvoiceNumberOut(BaseModel):
    """Next sequential invoice number (canonical ``RD-NNNN``)."""

    invoice_number: str


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=6, max_length=200)


class ForgotPasswordIn(BaseModel):
    """Username or email — used to look up the account for a reset link."""

    username_or_email: str = Field(min_length=1, max_length=255)


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=6, max_length=200)


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6, max_length=200)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=7, max_length=40)
    role: str = Field(default="user", pattern="^(admin|user)$")


class UserUpdate(BaseModel):
    email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=40)
    role: Optional[str] = Field(default=None, pattern="^(admin|user)$")
    active: Optional[int] = None


class UserResetPassword(BaseModel):
    """Admin sets a temporary password. Optionally also email a reset link."""

    new_password: str = Field(min_length=6, max_length=200)
    send_email: bool = False


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    active: int = 1
    must_change_password: bool = False
    technician_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamMemberOut(BaseModel):
    """Unified Settings → Team row (login + scheduler fields)."""

    id: int  # user id (password APIs use this)
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    active: int = 1
    must_change_password: bool = False
    technician_id: int
    name: str
    color: str
    start_location: str
    sort_order: int = 0
    created_at: Optional[datetime] = None


class TeamMemberCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6, max_length=200)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=7, max_length=40)
    role: str = Field(default="user", pattern="^(admin|user)$")
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#0D9488", min_length=4, max_length=20)
    start_location: str = Field(default="Shop", min_length=1, max_length=255)


class TeamMemberUpdate(BaseModel):
    email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=40)
    role: Optional[str] = Field(default=None, pattern="^(admin|user)$")
    active: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    color: Optional[str] = Field(default=None, min_length=4, max_length=20)
    start_location: Optional[str] = Field(default=None, min_length=1, max_length=255)


class TeamMoveIn(BaseModel):
    """Move an active team member up or down within the Active list."""

    direction: str = Field(pattern="^(up|down)$")


class TeamReorderIn(BaseModel):
    """Bulk reorder: user ids for active members in desired board order."""

    member_ids: list[int] = Field(min_length=1)
