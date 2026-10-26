"""Persisted shop rules shared by staff Settings and the public /book site."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import BOOKING_HOLD_MINUTES
from app.models import ShopSetting

KEY_BOOKING_HOLD_MINUTES = "booking_hold_minutes"


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(ShopSetting).filter(ShopSetting.key == key).first()
    if not row or row.value is None:
        return default
    return str(row.value)


def set_setting(db: Session, key: str, value: str) -> ShopSetting:
    row = db.query(ShopSetting).filter(ShopSetting.key == key).first()
    if not row:
        row = ShopSetting(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    db.flush()
    return row


def get_booking_hold_minutes(db: Session) -> int:
    raw = get_setting(db, KEY_BOOKING_HOLD_MINUTES, str(BOOKING_HOLD_MINUTES))
    try:
        minutes = int(str(raw).strip())
    except (TypeError, ValueError):
        minutes = BOOKING_HOLD_MINUTES
    return max(1, min(60, minutes))


def set_booking_hold_minutes(db: Session, minutes: int) -> int:
    minutes = max(1, min(60, int(minutes)))
    set_setting(db, KEY_BOOKING_HOLD_MINUTES, str(minutes))
    return minutes
