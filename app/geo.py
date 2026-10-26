"""Central Valley city helpers for demo routing / tech suggestions (no paid maps API)."""

from __future__ import annotations

import math
import re
from typing import Iterable, Optional, Tuple

# City centers used for proximity scoring.
CITY_COORDS: dict[str, tuple[float, float]] = {
    "bakersfield": (35.3733, -119.0187),
    "wasco": (35.5941, -119.3409),
    "shafter": (35.5005, -119.2718),
    "taft": (35.1425, -119.4565),
    "delano": (35.7688, -119.2471),
}

CITY_DISPLAY = {
    "bakersfield": "Bakersfield",
    "wasco": "Wasco",
    "shafter": "Shafter",
    "taft": "Taft",
    "delano": "Delano",
}

# Common Central Valley zips → city key.
ZIP_TO_CITY: dict[str, str] = {
    "93301": "bakersfield",
    "93302": "bakersfield",
    "93304": "bakersfield",
    "93305": "bakersfield",
    "93306": "bakersfield",
    "93307": "bakersfield",
    "93308": "bakersfield",
    "93309": "bakersfield",
    "93311": "bakersfield",
    "93312": "bakersfield",
    "93313": "bakersfield",
    "93314": "bakersfield",
    "93280": "wasco",
    "93263": "shafter",
    "93268": "taft",
    "93215": "delano",
    "93216": "delano",
}

# Rough start_location → city for shop yards (fallback when no jobs that day).
START_LOCATION_CITY: dict[str, str] = {
    "north": "bakersfield",
    "south": "bakersfield",
    "shop": "bakersfield",
}


def haversine_miles(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    r = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    h = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(h))


def infer_city(address: str) -> Optional[str]:
    """Return city key if address mentions a known city or zip."""
    text = (address or "").strip()
    if not text:
        return None
    lower = text.lower()
    for key in CITY_COORDS:
        if key in lower:
            return key
    zips = re.findall(r"\b(9\d{4})\b", text)
    for z in zips:
        if z in ZIP_TO_CITY:
            return ZIP_TO_CITY[z]
    return None


def address_ready_for_suggest(address: str) -> bool:
    text = (address or "").strip()
    if not text:
        return False
    if infer_city(text):
        return True
    return len(text) >= 10


def coords_for_city(city_key: Optional[str]) -> Tuple[float, float]:
    if city_key and city_key in CITY_COORDS:
        return CITY_COORDS[city_key]
    return CITY_COORDS["bakersfield"]


def coords_for_address(address: str) -> Tuple[Optional[str], Tuple[float, float]]:
    city = infer_city(address)
    return city, coords_for_city(city)


def start_location_coords(start_location: str) -> Tuple[float, float]:
    lower = (start_location or "").lower()
    for token, city in START_LOCATION_CITY.items():
        if token in lower:
            return CITY_COORDS[city]
    return CITY_COORDS["bakersfield"]


def suggest_technician(
    *,
    address: str,
    active_techs: Iterable,
    day_jobs_by_tech: dict[int, list],
) -> Optional[dict]:
    """
    Pick a technician near the address for the booking day.

    Preference:
    1. Tech whose existing jobs that day are closest to the inferred city.
    2. Else fewest jobs that day, then start_location proximity.
    """
    techs = list(active_techs)
    if not techs:
        return None

    city, target = coords_for_address(address)
    city_label = CITY_DISPLAY.get(city or "", "") if city else ""

    scored: list[tuple] = []
    for tech in techs:
        jobs = day_jobs_by_tech.get(tech.id, [])
        if jobs:
            distances = []
            for job in jobs:
                addr = getattr(getattr(job, "customer", None), "address", None) or ""
                _, job_xy = coords_for_address(addr)
                distances.append(haversine_miles(target, job_xy))
            nearest = min(distances)
            avg = sum(distances) / len(distances)
            # Prefer techs already working near the customer city that day.
            scored.append(
                (
                    0,
                    nearest,
                    avg,
                    len(jobs),
                    tech.name.lower(),
                    tech,
                    "jobs",
                    nearest,
                )
            )
        else:
            shop = start_location_coords(getattr(tech, "start_location", "") or "")
            dist = haversine_miles(target, shop)
            scored.append(
                (
                    1,
                    dist,
                    dist,
                    0,
                    tech.name.lower(),
                    tech,
                    "empty",
                    dist,
                )
            )

    scored.sort(key=lambda row: (row[0], row[1], row[2], row[3], row[4]))
    best = scored[0]
    tech = best[5]
    mode = best[6]
    nearest_mi = best[7]

    if mode == "jobs" and city_label:
        reason = f"closer to {city_label} jobs today"
    elif mode == "jobs":
        reason = f"already in the area today (~{nearest_mi:.0f} mi to nearest job)"
    elif city_label:
        reason = f"lightest schedule · near {city_label}"
    else:
        reason = "lightest schedule that day"

    return {
        "technician_id": tech.id,
        "name": tech.name,
        "reason": reason,
        "city": city_label or None,
    }


def collapse_slots_nearest_tech(
    slots: list[dict],
    *,
    address: str,
    techs_by_id: dict[int, object],
    day_jobs_by_tech: dict[int, list],
    hide_technician_name: bool = True,
) -> list[dict]:
    """
    One slot per start time for the customer booking UI.

    When several techs are free (or all blocked) at the same instant, keep the
    one nearest the customer address using the same scoring as suggest_technician.
    Without a usable address, keep a stable name-ordered pick.
    """
    if not slots:
        return []

    by_start: dict = {}
    for slot in slots:
        key = slot["starts_at"]
        by_start.setdefault(key, []).append(slot)

    collapsed: list[dict] = []
    for starts_at in sorted(by_start.keys()):
        group = by_start[starts_at]
        available = [s for s in group if s.get("available", True)]
        candidates = available if available else group

        if len(candidates) == 1:
            pick = candidates[0]
        else:
            pick = None
            if address_ready_for_suggest(address):
                cand_techs = [
                    techs_by_id[s["technician_id"]]
                    for s in candidates
                    if s.get("technician_id") in techs_by_id
                ]
                suggestion = suggest_technician(
                    address=address,
                    active_techs=cand_techs,
                    day_jobs_by_tech=day_jobs_by_tech,
                )
                if suggestion:
                    tid = suggestion["technician_id"]
                    pick = next(
                        (s for s in candidates if s.get("technician_id") == tid),
                        None,
                    )
            if pick is None:
                pick = sorted(
                    candidates,
                    key=lambda s: (
                        (s.get("technician_name") or "").lower(),
                        s.get("technician_id") or 0,
                    ),
                )[0]

        out = dict(pick)
        if hide_technician_name:
            out["technician_name"] = ""
        collapsed.append(out)

    return collapsed
