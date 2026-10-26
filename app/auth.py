"""Session cookie auth + roles.

Role matrix (keep simple):
  - admin: full app, including Settings and user management
  - user:  everything except Settings (no Settings nav / Settings-only APIs)

Password reset:
  - Forgot password: username or email → emailed one-time link (SendGrid)
  - Admin can set a temporary password and/or trigger a reset email
  - Any logged-in user can change their own password
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from urllib.parse import urljoin

from fastapi import Depends, HTTPException, Request
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import AUTH_DISABLED, BUSINESS_NAME
from app.db import get_db
from app.email import email_configured, is_valid_email, send_email
from app.models import User

logger = logging.getLogger("uvicorn.error")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_USER_KEY = "user_id"

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
# Placeholder — replace in Settings → Users so forgot-password works for this account.
DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PHONE = "555-0100"

RESET_TOKEN_HOURS = 2


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    name = (username or "").strip().lower()
    if not name:
        return None
    return db.query(User).filter(User.username == name).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    addr = (email or "").strip().lower()
    if not addr:
        return None
    return db.query(User).filter(User.email == addr).first()


def find_user_for_reset(db: Session, username_or_email: str) -> Optional[User]:
    raw = (username_or_email or "").strip()
    if not raw:
        return None
    if "@" in raw:
        return get_user_by_email(db, raw)
    return get_user_by_username(db, raw)


def bypass_admin_user(db: Session) -> Optional[User]:
    """Active Admin used when AUTH_DISABLED (prefer seeded username `admin`)."""
    user = get_user_by_username(db, DEFAULT_ADMIN_USERNAME)
    if user and int(user.active or 0) and (user.role or "").strip().lower() == "admin":
        return user
    return (
        db.query(User)
        .filter(User.active == 1, User.role == "admin")
        .order_by(User.id.asc())
        .first()
    )


def current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    # Temporary bypass: AUTH_DISABLED=1 → treat every request as logged-in Admin.
    if AUTH_DISABLED:
        return bypass_admin_user(db)
    user_id = request.session.get(SESSION_USER_KEY)
    if not user_id:
        return None
    user = get_user_by_id(db, int(user_id))
    if not user or not int(user.active or 0):
        request.session.pop(SESSION_USER_KEY, None)
        return None
    return user


def require_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if (user.role or "").strip().lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def login_user(request: Request, user: User) -> None:
    request.session[SESSION_USER_KEY] = user.id


def logout_user(request: Request) -> None:
    request.session.pop(SESSION_USER_KEY, None)


def ensure_default_admin(db: Session) -> None:
    """Seed admin/admin123 once when the users table is empty. Change after first login."""
    if db.query(User).count() == 0:
        admin = User(
            username=DEFAULT_ADMIN_USERNAME,
            email=DEFAULT_ADMIN_EMAIL,
            phone=DEFAULT_ADMIN_PHONE,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
            role="admin",
            active=1,
            must_change_password=1,
        )
        db.add(admin)
        db.commit()
        logger.warning(
            "Seeded default admin %r / %r (email %r) — change password after first login.",
            DEFAULT_ADMIN_USERNAME,
            DEFAULT_ADMIN_PASSWORD,
            DEFAULT_ADMIN_EMAIL,
        )
        return

    # Backfill placeholder contact on the seeded admin if an older DB left them blank.
    admin = get_user_by_username(db, DEFAULT_ADMIN_USERNAME)
    if not admin:
        return
    changed = False
    if not (admin.email or "").strip():
        admin.email = DEFAULT_ADMIN_EMAIL
        changed = True
    if not (getattr(admin, "phone", None) or "").strip():
        admin.phone = DEFAULT_ADMIN_PHONE
        changed = True
    if changed:
        db.commit()
        logger.warning(
            "Filled placeholder email/phone on admin (%r / %r) — update in Settings → Users.",
            DEFAULT_ADMIN_EMAIL,
            DEFAULT_ADMIN_PHONE,
        )


def user_public_dict(user: User) -> dict:
    must_change = bool(int(getattr(user, "must_change_password", 0) or 0))
    # No password prompts while login is temporarily disabled.
    if AUTH_DISABLED:
        must_change = False
    tech_id = getattr(user, "technician_id", None)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "active": int(user.active or 0),
        "must_change_password": must_change,
        # 1:1 team link — mobile schedule defaults to this technician's lane.
        "technician_id": int(tech_id) if tech_id is not None else None,
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
    }


def issue_reset_token(user: User) -> str:
    """Store a hashed one-time token on the user; return the raw token for the email link."""
    raw = secrets.token_urlsafe(32)
    user.reset_token_hash = _hash_token(raw)
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS)
    return raw


def clear_reset_token(user: User) -> None:
    user.reset_token_hash = None
    user.reset_token_expires = None


def user_for_reset_token(db: Session, token: str) -> Optional[User]:
    raw = (token or "").strip()
    if not raw:
        return None
    digest = _hash_token(raw)
    user = db.query(User).filter(User.reset_token_hash == digest).first()
    if not user or not int(user.active or 0):
        return None
    expires = user.reset_token_expires
    if not expires or expires < datetime.utcnow():
        return None
    return user


def build_reset_url(request: Request, token: str) -> str:
    base = str(request.base_url)
    return urljoin(base, f"reset-password?token={token}")


def send_password_reset_email(request: Request, user: User) -> Tuple[bool, str]:
    """Issue token + email reset link. Returns (ok, detail_message)."""
    email = (user.email or "").strip()
    if not is_valid_email(email):
        return False, "User has no valid email on file"
    if not email_configured():
        return (
            False,
            "Email is not configured (set SENDGRID_API_KEY and EMAIL_FROM)",
        )
    token = issue_reset_token(user)
    link = build_reset_url(request, token)
    brand = BUSINESS_NAME or "Barber Shop"
    subject = f"{brand} password reset"
    text = (
        f"Hi {user.username},\n\n"
        f"Reset your {brand} password using this link (expires in {RESET_TOKEN_HOURS} hours):\n\n"
        f"{link}\n\n"
        "If you did not request this, you can ignore this email.\n"
    )
    html = (
        f"<p>Hi {user.username},</p>"
        f"<p>Reset your <strong>{brand}</strong> password using this link "
        f"(expires in {RESET_TOKEN_HOURS} hours):</p>"
        f'<p><a href="{link}">{link}</a></p>'
        "<p>If you did not request this, you can ignore this email.</p>"
    )
    result = send_email(to_email=email, subject=subject, text_body=text, html_body=html)
    if not result.get("ok"):
        clear_reset_token(user)
        return False, result.get("detail") or "Could not send email"
    return True, "Reset email sent"
