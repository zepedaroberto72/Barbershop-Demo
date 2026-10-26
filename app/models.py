from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    """App login account, linked 1:1 to a Technician for scheduling.

    Roles: ``admin`` (Settings + full app) | ``user`` (everything except Settings).
    Email is required for password-reset links; phone is contact-only.
    Display name / color / start location live on the linked Technician row
    so appointment and block FKs stay on ``technicians.id``.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    must_change_password: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reset_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    technician_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("technicians.id"), nullable=True, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    technician: Mapped[Optional["Technician"]] = relationship(
        back_populates="user",
        foreign_keys=[technician_id],
    )


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#0D9488")
    start_location: Mapped[str] = mapped_column(String(255), nullable=False, default="Shop")
    active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Board / Settings column order (lower first). Migrated for existing rows.
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Weekly schedule: HH:MM + ISO weekdays "1,2,3,4,5" (Mon=1 … Sun=7)
    work_start: Mapped[str] = mapped_column(String(5), nullable=False, default="08:00")
    work_end: Mapped[str] = mapped_column(String(5), nullable=False, default="18:00")
    work_days: Mapped[str] = mapped_column(String(32), nullable=False, default="1,2,3,4,5")

    appointments: Mapped[List["Appointment"]] = relationship(back_populates="technician")
    blocks: Mapped[List["TechBlock"]] = relationship(
        back_populates="technician",
        cascade="all, delete-orphan",
    )
    user: Mapped[Optional["User"]] = relationship(
        back_populates="technician",
        uselist=False,
        foreign_keys="User.technician_id",
    )


class TechBlock(Base):
    """Blocked-off period for a technician.

    Full-day / multi-day: ``start_time`` and ``end_time`` are NULL.
    Hour block: both set (HH:MM), applied on each calendar day in the date range.
    """

    __tablename__ = "tech_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    technician_id: Mapped[int] = mapped_column(ForeignKey("technicians.id"), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    technician: Mapped["Technician"] = relationship(back_populates="blocks")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    appointments: Mapped[List["Appointment"]] = relationship(back_populates="customer")


class Service(Base):
    """Bookable barbershop service (customer /book menu)."""

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class ShopSetting(Base):
    """Key/value shop rules (booking hold, etc.) editable in Settings."""

    __tablename__ = "shop_settings"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(String(255), nullable=False, default="")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    technician_id: Mapped[int] = mapped_column(ForeignKey("technicians.id"), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    travel_buffer_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    appliance: Mapped[str] = mapped_column(String(80), nullable=False)
    job_type: Mapped[str] = mapped_column(String(40), nullable=False, default="Repair")
    issue: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="scheduled")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    customer: Mapped["Customer"] = relationship(back_populates="appointments")
    technician: Mapped["Technician"] = relationship(back_populates="appointments")

    @property
    def ends_at(self) -> datetime:
        return self.starts_at + timedelta(minutes=self.duration_minutes)


class SiteInterestInquiry(Base):
    """Lead capture for visitors interested in a similar booking site."""

    __tablename__ = "site_interest_inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    business_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Invoice(Base):
    """Persisted invoice document (linked appointment optional)."""

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    invoice_date: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("appointments.id"), nullable=True, index=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    technician_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tax_rate: Mapped[float] = mapped_column(Float, nullable=False, default=8.25)
    lines_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="job")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
