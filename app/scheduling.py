from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Iterable, Optional

from app.config import (
    DEFAULT_TRAVEL_BUFFER,
    SLOT_STEP_MINUTES,
    WORKDAY_END_HOUR,
    WORKDAY_START_HOUR,
)
from app.models import Appointment, TechBlock, Technician

DEFAULT_WORK_DAYS = "1,2,3,4,5"
DEFAULT_WORK_START = f"{WORKDAY_START_HOUR:02d}:00"
DEFAULT_WORK_END = f"{WORKDAY_END_HOUR:02d}:00"


def calendar_day_bounds(day: date) -> tuple[datetime, datetime]:
    """Midnight → next midnight for fetching appointments on a calendar day."""
    start = datetime(day.year, day.month, day.day, 0, 0)
    return start, start + timedelta(days=1)


def day_bounds(day: date) -> tuple[datetime, datetime]:
    """Legacy global shop hours (fallback when no per-tech schedule)."""
    start = datetime(day.year, day.month, day.day, WORKDAY_START_HOUR, 0)
    end = datetime(day.year, day.month, day.day, WORKDAY_END_HOUR, 0)
    return start, end


def parse_hhmm(value: Optional[str], default_hour: int) -> time:
    raw = (value or "").strip()
    if not raw:
        return time(default_hour, 0)
    try:
        parts = raw.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return time(default_hour, 0)
        return time(hour, minute)
    except (TypeError, ValueError):
        return time(default_hour, 0)


def parse_work_days(value: Optional[str]) -> set[int]:
    """ISO weekdays Mon=1 … Sun=7."""
    raw = (value or "").strip() or DEFAULT_WORK_DAYS
    days: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            n = int(part)
        except ValueError:
            continue
        if 1 <= n <= 7:
            days.add(n)
    return days or {1, 2, 3, 4, 5}


def normalize_work_days(value: Optional[str]) -> str:
    days = sorted(parse_work_days(value))
    return ",".join(str(d) for d in days) if days else DEFAULT_WORK_DAYS


def normalize_hhmm(value: Optional[str], default_hour: int) -> str:
    t = parse_hhmm(value, default_hour)
    return f"{t.hour:02d}:{t.minute:02d}"


def iso_weekday(day: date) -> int:
    """Python weekday Mon=0 → ISO Mon=1."""
    return day.weekday() + 1


def tech_works_on(tech: Technician, day: date) -> bool:
    return iso_weekday(day) in parse_work_days(getattr(tech, "work_days", None))


def block_covers_day(block: TechBlock, day: date) -> bool:
    return block.start_date <= day <= block.end_date


def is_full_day_block(block: TechBlock) -> bool:
    """True when the block covers entire calendar days (no hour window)."""
    start_t = (getattr(block, "start_time", None) or "").strip()
    end_t = (getattr(block, "end_time", None) or "").strip()
    return not start_t and not end_t


def block_window_on_day(
    block: TechBlock,
    day: date,
) -> Optional[tuple[datetime, datetime]]:
    """Return the blocked datetime window on ``day``, or None if block does not apply."""
    if not block_covers_day(block, day):
        return None
    if is_full_day_block(block):
        start = datetime(day.year, day.month, day.day, 0, 0)
        return start, start + timedelta(days=1)
    start_raw = (block.start_time or "").strip()
    end_raw = (block.end_time or "").strip()
    if not start_raw or not end_raw:
        start = datetime(day.year, day.month, day.day, 0, 0)
        return start, start + timedelta(days=1)
    start_t = parse_hhmm(start_raw, 0)
    end_t = parse_hhmm(end_raw, 23)
    start = datetime(day.year, day.month, day.day, start_t.hour, start_t.minute)
    end = datetime(day.year, day.month, day.day, end_t.hour, end_t.minute)
    if end <= start:
        return None
    return start, end


def block_reason_on_day(blocks: Iterable[TechBlock], day: date) -> Optional[str]:
    """Reason when a *full-day* block covers ``day`` (hour blocks ignored)."""
    for block in blocks:
        if block_covers_day(block, day) and is_full_day_block(block):
            reason = (block.reason or "").strip()
            return reason or "Time off"
    return None


def slot_blocked_by_blocks(
    starts_at: datetime,
    ends_at: datetime,
    blocks: Iterable[TechBlock],
) -> Optional[str]:
    """If the job window overlaps any tech block, return a reason string."""
    day = starts_at.date()
    for block in blocks:
        window = block_window_on_day(block, day)
        if not window:
            continue
        b_start, b_end = window
        if starts_at < b_end and ends_at > b_start:
            reason = (block.reason or "").strip()
            if is_full_day_block(block):
                return reason or "Time off"
            label = f"{block.start_time}–{block.end_time}"
            return reason or f"Blocked {label}"
    return None


def tech_day_bounds(
    tech: Technician,
    day: date,
) -> Optional[tuple[datetime, datetime]]:
    """Return working window for tech on day, or None if not a workday."""
    if not tech_works_on(tech, day):
        return None
    start_t = parse_hhmm(getattr(tech, "work_start", None), WORKDAY_START_HOUR)
    end_t = parse_hhmm(getattr(tech, "work_end", None), WORKDAY_END_HOUR)
    start = datetime(day.year, day.month, day.day, start_t.hour, start_t.minute)
    end = datetime(day.year, day.month, day.day, end_t.hour, end_t.minute)
    if end <= start:
        return None
    return start, end


def slot_availability(
    starts_at: datetime,
    duration_minutes: int,
    travel_buffer: int,
    existing: Iterable[Appointment],
    day_start: Optional[datetime] = None,
    day_end: Optional[datetime] = None,
    ignore_id: Optional[int] = None,
    tech_blocks: Optional[Iterable[TechBlock]] = None,
) -> tuple[bool, Optional[str]]:
    """Return (available, reason). Reason is set when unavailable."""
    ends_at = starts_at + timedelta(minutes=duration_minutes)
    if day_start and starts_at < day_start:
        return False, "Outside workday"
    if day_end and ends_at > day_end:
        return False, "Outside workday"

    if tech_blocks is not None:
        blocked = slot_blocked_by_blocks(starts_at, ends_at, tech_blocks)
        if blocked:
            return False, blocked

    # Candidate occupies [start - its travel, end) so drive time from the prior job is reserved.
    candidate_blocked_start = starts_at - timedelta(minutes=travel_buffer)

    for appt in existing:
        if ignore_id is not None and appt.id == ignore_id:
            continue
        if appt.status == "cancelled":
            continue
        other_buffer = appt.travel_buffer_minutes or DEFAULT_TRAVEL_BUFFER
        job_start = appt.starts_at
        job_end = appt.ends_at
        block_start = job_start - timedelta(minutes=other_buffer)
        block_end = job_end

        if candidate_blocked_start < block_end and ends_at > block_start:
            # Prefer a more specific reason when the job core overlaps.
            if starts_at < job_end and ends_at > job_start:
                return False, "Job conflict"
            return False, "Travel buffer"
    return True, None


def appointment_fits(
    starts_at: datetime,
    duration_minutes: int,
    travel_buffer: int,
    existing: Iterable[Appointment],
    day_start: Optional[datetime] = None,
    day_end: Optional[datetime] = None,
    ignore_id: Optional[int] = None,
    tech_blocks: Optional[Iterable[TechBlock]] = None,
) -> bool:
    """Check job fits workday and does not collide with travel buffers around existing jobs."""
    ok, _ = slot_availability(
        starts_at,
        duration_minutes,
        travel_buffer,
        existing,
        day_start=day_start,
        day_end=day_end,
        ignore_id=ignore_id,
        tech_blocks=tech_blocks,
    )
    return ok


def suggest_slots(
    day: date,
    technicians: list[Technician],
    appointments_by_tech: dict[int, list[Appointment]],
    duration_minutes: int,
    travel_buffer: int = DEFAULT_TRAVEL_BUFFER,
    ignore_id: Optional[int] = None,
    include_unavailable: bool = True,
    blocks_by_tech: Optional[dict[int, list[TechBlock]]] = None,
) -> list[dict]:
    """Return workday candidates (every SLOT_STEP_MINUTES) with availability flags.

    Respects each technician's working days/hours, full-day blocks, and hour blocks.
    When ``include_unavailable`` is True (default), conflicted candidates are still
    returned; full-day blocks / days off yield no candidates for that tech.
    """
    suggestions: list[dict] = []
    step = timedelta(minutes=SLOT_STEP_MINUTES)
    blocks_map = blocks_by_tech or {}

    for tech in technicians:
        if not tech.active:
            continue

        tech_blocks = blocks_map.get(tech.id, [])
        if block_reason_on_day(tech_blocks, day):
            continue

        bounds = tech_day_bounds(tech, day)
        if not bounds:
            continue

        day_start, day_end = bounds
        existing = appointments_by_tech.get(tech.id, [])
        cursor = day_start

        while cursor + timedelta(minutes=duration_minutes) <= day_end:
            available, reason = slot_availability(
                cursor,
                duration_minutes,
                travel_buffer,
                existing,
                day_start=day_start,
                day_end=day_end,
                ignore_id=ignore_id,
                tech_blocks=tech_blocks,
            )
            if available or include_unavailable:
                suggestions.append(
                    {
                        "technician_id": tech.id,
                        "technician_name": tech.name,
                        "starts_at": cursor,
                        "ends_at": cursor + timedelta(minutes=duration_minutes),
                        "travel_buffer_minutes": travel_buffer,
                        "available": available,
                        "reason": reason,
                    }
                )
            cursor += step

    suggestions.sort(key=lambda s: (s["starts_at"], s["technician_name"]))
    return suggestions
