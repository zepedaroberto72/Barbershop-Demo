"""Unify Users + Technicians into one Team (1:1 login ↔ scheduler row).

Auth stays on ``User``; appointments/blocks keep ``technicians.id``.
``User.technician_id`` is the join. Startup ``ensure_team_links`` merges
existing desk logins with field techs (preferred pairs first).
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import (
    DEFAULT_ADMIN_PHONE,
    get_user_by_username,
    hash_password,
)
from app.models import Technician, User


def next_tech_sort_order(db: Session) -> int:
    """Next sort_order for a newly created technician (append to end)."""
    mx = db.query(func.max(Technician.sort_order)).scalar()
    return 0 if mx is None else int(mx) + 1

logger = logging.getLogger("uvicorn.error")

# Preferred demo merges: login username → technician display names (canonical + aliases).
PREFERRED_TEAM_LINKS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("admin", ("Alex Rivera", "Alex")),
    ("dispatcher", ("Jordan Lee", "Jordan")),
)

DEFAULT_DISPATCHER_USERNAME = "dispatcher"
DEFAULT_DISPATCHER_PASSWORD = "dispatcher123"
DEFAULT_DISPATCHER_EMAIL = "dispatcher@example.com"
DEFAULT_DISPATCHER_PHONE = "555-0101"

_TECH_PALETTE = (
    "#0D9488",
    "#EA580C",
    "#2563EB",
    "#DB2777",
    "#16A34A",
    "#D97706",
    "#0891B2",
    "#DC2626",
    "#7C3AED",
    "#4D7C0F",
    "#E11D48",
    "#4F46E5",
    "#C026D3",
    "#0284C7",
    "#A16207",
    "#9333EA",
)


def _slug_username(name: str) -> str:
    raw = (name or "").strip().lower()
    slug = re.sub(r"[^a-z0-9._-]+", ".", raw).strip(".")
    slug = re.sub(r"\.{2,}", ".", slug)
    if len(slug) < 2:
        slug = f"tech.{slug}" if slug else "tech"
    return slug[:80]


def unique_username(db: Session, base: str) -> str:
    candidate = _slug_username(base)
    if not get_user_by_username(db, candidate):
        return candidate
    for i in range(2, 100):
        suffix = f".{i}"
        trimmed = candidate[: 80 - len(suffix)] + suffix
        if not get_user_by_username(db, trimmed):
            return trimmed
    return f"tech.{db.query(User).count() + 1}"


def _find_tech_by_names(techs: list[Technician], names: tuple[str, ...]) -> Optional[Technician]:
    wanted = {n.strip() for n in names if n and n.strip()}
    for tech in techs:
        if tech.name in wanted:
            return tech
    return None


def _linked_tech_ids(db: Session) -> set[int]:
    rows = (
        db.query(User.technician_id)
        .filter(User.technician_id.isnot(None))
        .all()
    )
    return {int(r[0]) for r in rows if r[0] is not None}


def _next_palette_color(used: set[str], index: int) -> str:
    for color in _TECH_PALETTE:
        if color.upper() not in used:
            return color
    return _TECH_PALETTE[index % len(_TECH_PALETTE)]


def _create_tech_for_user(db: Session, user: User, *, color: str, name: Optional[str] = None) -> Technician:
    display = (name or user.username or "Team member").strip()[:100] or "Team member"
    tech = Technician(
        name=display,
        color=color,
        start_location="Shop",
        active=int(user.active or 0) or 1,
        sort_order=next_tech_sort_order(db),
    )
    db.add(tech)
    db.flush()
    user.technician_id = tech.id
    return tech


def _create_user_for_tech(
    db: Session,
    tech: Technician,
    *,
    username: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    role: str = "user",
    password: str = "changeme123",
) -> User:
    uname = username or unique_username(db, tech.name)
    addr = (email or f"{uname}@example.com").strip().lower()
    user = User(
        username=uname,
        email=addr,
        phone=(phone or DEFAULT_ADMIN_PHONE).strip(),
        password_hash=hash_password(password),
        role=role,
        active=int(tech.active or 0) or 1,
        must_change_password=1,
        technician_id=tech.id,
    )
    db.add(user)
    db.flush()
    return user


def _ensure_preferred_links(db: Session) -> None:
    techs = list(db.query(Technician).order_by(Technician.id).all())
    taken = _linked_tech_ids(db)

    for username, names in PREFERRED_TEAM_LINKS:
        user = get_user_by_username(db, username)
        tech = _find_tech_by_names(techs, names)
        if not tech:
            continue
        if tech.id in taken:
            # Already linked to someone — only claim if that someone is this user.
            owner = db.query(User).filter(User.technician_id == tech.id).first()
            if owner and owner.username != username:
                continue
        if user and user.technician_id and user.technician_id != tech.id:
            continue
        if user:
            if user.technician_id != tech.id:
                user.technician_id = tech.id
                taken.add(tech.id)
                logger.info("Linked team login %r → technician %r (id=%s)", username, tech.name, tech.id)
            continue
        # Seed dispatcher login for Jordan when missing.
        if username == DEFAULT_DISPATCHER_USERNAME:
            _create_user_for_tech(
                db,
                tech,
                username=DEFAULT_DISPATCHER_USERNAME,
                email=DEFAULT_DISPATCHER_EMAIL,
                phone=DEFAULT_DISPATCHER_PHONE,
                role="user",
                password=DEFAULT_DISPATCHER_PASSWORD,
            )
            taken.add(tech.id)
            logger.warning(
                "Seeded team login %r / %r linked to %r — change password after first login.",
                DEFAULT_DISPATCHER_USERNAME,
                DEFAULT_DISPATCHER_PASSWORD,
                tech.name,
            )


def ensure_team_links(db: Session) -> None:
    """Link every User ↔ Technician (preferred pairs, then create missing halves)."""
    _ensure_preferred_links(db)
    db.flush()

    users = list(db.query(User).order_by(User.id).all())
    techs = list(db.query(Technician).order_by(Technician.id).all())
    taken = _linked_tech_ids(db)
    used_colors = {t.color.upper() for t in techs if t.color}

    # Users without a technician → create scheduler row (keep login id).
    for i, user in enumerate(users):
        if user.technician_id:
            tech = db.query(Technician).filter(Technician.id == user.technician_id).first()
            if tech:
                continue
            user.technician_id = None
        # Prefer claiming an unlinked tech with the same name as username (rare).
        claim = next(
            (
                t
                for t in techs
                if t.id not in taken
                and t.name.strip().lower() in {user.username, user.username.replace(".", " ")}
            ),
            None,
        )
        if claim:
            user.technician_id = claim.id
            taken.add(claim.id)
            continue
        color = _next_palette_color(used_colors, i)
        used_colors.add(color.upper())
        # Prefer title-case username as display name for desk-only logins.
        display = user.username.replace(".", " ").replace("_", " ").title()
        tech = _create_tech_for_user(db, user, color=color, name=display)
        techs.append(tech)
        taken.add(tech.id)
        logger.info("Created technician %r for login %r", tech.name, user.username)

    db.flush()
    taken = _linked_tech_ids(db)

    # Technicians without a login → create user (keep tech id for appointments).
    for tech in list(db.query(Technician).order_by(Technician.id).all()):
        if tech.id in taken:
            continue
        user = _create_user_for_tech(db, tech)
        taken.add(tech.id)
        logger.warning(
            "Created login %r for technician %r (temp password changeme123) — set a real password in Settings.",
            user.username,
            tech.name,
        )

    # Keep active flags roughly aligned for linked pairs (login is source of truth for desk).
    for user in db.query(User).filter(User.technician_id.isnot(None)).all():
        tech = db.query(Technician).filter(Technician.id == user.technician_id).first()
        if not tech:
            continue
        # If either side is inactive, scheduling should hide the tech.
        # Prefer user.active when they differ after first link.
        if int(tech.active or 0) != int(user.active or 0):
            tech.active = 1 if int(user.active or 0) else 0

    db.commit()
