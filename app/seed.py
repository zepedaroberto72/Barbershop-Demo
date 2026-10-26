from __future__ import annotations

import random
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.config import DEFAULT_TRAVEL_BUFFER, WORKDAY_END_HOUR, WORKDAY_START_HOUR
from app.models import Appointment, Customer, Service, Technician
from app.schemas import JOB_TYPES, default_duration_for_job_type

APPLIANCES = (
    "Washer",
    "Dryer",
    "Refrigerator",
    "Dishwasher",
    "Oven / Range",
    "Microwave",
    "Garbage Disposal",
    "Ice Maker",
)

ISSUES = (
    "Won't start",
    "Not draining",
    "No heat",
    "Not cooling",
    "Leaking water",
    "Loud grinding noise",
    "Error code on display",
    "Door won't latch",
    "Cycles but never finishes",
    "Ice buildup in freezer",
    "Burner not heating",
    "Smell of burning plastic",
)

FIRST_NAMES = (
    "Maria", "Luis", "Priya", "Dan", "Sofia", "Chris", "Elena", "Marcus",
    "Aisha", "Tom", "Nina", "Omar", "Grace", "Hector", "Kim", "Raj",
    "Paula", "Derek", "Anita", "Victor", "Lena", "Sam", "Rosa", "James",
)

LAST_NAMES = (
    "Santos", "Ortega", "Nair", "Okonkwo", "Reyes", "Patel", "Chen", "Brooks",
    "Nguyen", "Kim", "Garcia", "Hassan", "Miller", "Torres", "Park", "Singh",
    "Lopez", "Walsh", "Diaz", "Floyd", "Ruiz", "Carter", "Mendez", "Young",
)

STREETS = (
    "Chester Ave", "Truxtun Ave", "Main St", "Central Ave", "High St",
    "7th St", "Kern St", "Union Ave", "Ming Ave", "Olive Dr",
    "Palm Ave", "Jefferson St", "Garces Hwy", "Lake St", "H St",
)

CITIES = (
    ("Bakersfield", "CA", "93301"),
    ("Wasco", "CA", "93280"),
    ("Shafter", "CA", "93263"),
    ("Taft", "CA", "93268"),
    ("Delano", "CA", "93215"),
)

# Weekday chair slots — ~half filled leaves open bookable gaps on the day board.
WEEKDAY_SLOTS = ((9, 0), (10, 0), (11, 0), (12, 0), (13, 0), (14, 0), (15, 0), (16, 0))
WEEKEND_SLOTS = ((10, 0), (11, 30), (13, 0), (14, 30))

# Service-style labels stored on appointments (appliance / job_type columns).
_CUT_SERVICES = (
    ("Haircut", "Haircut", 30),
    ("Haircut And Beard", "Haircut And Beard", 50),
    ("Kids 12 And Under", "Kids Cut", 30),
    ("Beard", "Beard", 20),
)
_CUT_NOTES = (
    "Fade preference on file",
    "Walk-in referral",
    "Regular every 3 weeks",
    "Beard shape-up only",
    "Skin fade + lineup",
    None,
    None,
)

# Plausible Central Valley stops for the demo week map.
# Cities: Bakersfield, Wasco, Shafter, Taft, Delano.
SAMPLE_JOBS = [
    # Prior week (past / history demos)
    {
        "day_offset": -5,
        "hour": 10,
        "minute": 0,
        "tech": "Alex Rivera",
        "name": "Tom Nguyen",
        "phone": "555-0301",
        "address": "2201 Truxtun Ave, Bakersfield, CA 93301",
        "notes": None,
        "appliance": "Washer",
        "issue": "Replaced drain pump",
        "status": "completed",
        "travel": 30,
        "job_type": "Repair",
    },
    {
        "day_offset": -4,
        "hour": 13,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Sofia Reyes",
        "phone": "555-0302",
        "address": "410 Main St, Wasco, CA 93280",
        "notes": None,
        "appliance": "Refrigerator",
        "issue": "Sealed coolant leak — cooling restored",
        "status": "completed",
        "travel": 35,
        "job_type": "Repair",
    },
    {
        "day_offset": -2,
        "hour": 9,
        "minute": 0,
        "tech": "Alex Rivera",
        "name": "Chris Patel",
        "phone": "555-0303",
        "address": "88 Central Ave, Shafter, CA 93263",
        "notes": "Customer cancelled on arrival",
        "appliance": "Dryer",
        "issue": "No heat — cancelled",
        "status": "cancelled",
        "travel": 30,
        "job_type": "Diagnose",
    },
    # Monday
    {
        "day_offset": 0,
        "hour": 9,
        "minute": 0,
        "tech": "Alex Rivera",
        "name": "Maria Santos",
        "phone": "555-0142",
        "address": "1847 Chester Ave, Bakersfield, CA 93301",
        "notes": "Gate code 4412",
        "appliance": "Washer",
        "issue": "Won't drain — loud grinding on spin",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 0,
        "hour": 11,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Luis Ortega",
        "phone": "555-0167",
        "address": "412 Central Ave, Shafter, CA 93263",
        "notes": None,
        "appliance": "Dryer",
        "issue": "No heat — drum still tumbles",
        "status": "confirmed",
        "travel": 40,
    },
    {
        "day_offset": 0,
        "hour": 14,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Priya Nair",
        "phone": "555-0188",
        "address": "905 7th St, Wasco, CA 93280",
        "notes": "Park in alley",
        "appliance": "Dishwasher",
        "issue": "Not draining after cycle",
        "status": "scheduled",
        "travel": 35,
    },
    {
        "day_offset": 0,
        "hour": 9,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Dan Okonkwo",
        "phone": "555-0198",
        "address": "1120 High St, Delano, CA 93215",
        "notes": None,
        "appliance": "Refrigerator",
        "issue": "Not cooling — freezer still cold",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 0,
        "hour": 11,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Elena Vargas",
        "phone": "555-0211",
        "address": "628 Palm Ave, Wasco, CA 93280",
        "notes": "Dog in backyard",
        "appliance": "Oven / Range",
        "issue": "Oven won't ignite",
        "status": "scheduled",
        "travel": 40,
    },
    {
        "day_offset": 0,
        "hour": 14,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Chris Nguyen",
        "phone": "555-0224",
        "address": "3300 Truxtun Ave, Bakersfield, CA 93301",
        "notes": None,
        "appliance": "Microwave",
        "issue": "Sparks when running",
        "status": "scheduled",
        "travel": 45,
    },
    # Tuesday
    {
        "day_offset": 1,
        "hour": 8,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Hannah Brooks",
        "phone": "555-0235",
        "address": "215 Center St, Taft, CA 93268",
        "notes": None,
        "appliance": "Washer",
        "issue": "Leaking from bottom during fill",
        "status": "confirmed",
        "travel": 45,
    },
    {
        "day_offset": 1,
        "hour": 11,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Omar Haddad",
        "phone": "555-0246",
        "address": "890 Ming Ave, Bakersfield, CA 93309",
        "notes": "Call on arrival",
        "appliance": "Refrigerator",
        "issue": "Ice maker jammed",
        "status": "scheduled",
        "travel": 40,
    },
    {
        "day_offset": 1,
        "hour": 14,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Sofia Reyes",
        "phone": "555-0257",
        "address": "150 James St, Shafter, CA 93263",
        "notes": None,
        "appliance": "Dryer",
        "issue": "Takes two cycles to dry",
        "status": "scheduled",
        "travel": 35,
    },
    {
        "day_offset": 1,
        "hour": 9,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Tom Whitfield",
        "phone": "555-0268",
        "address": "440 Main St, Delano, CA 93215",
        "notes": None,
        "appliance": "Dishwasher",
        "issue": "Soap dispenser stuck closed",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 1,
        "hour": 12,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Aisha Rahman",
        "phone": "555-0279",
        "address": "1720 F St, Bakersfield, CA 93301",
        "notes": "Apartment 2B",
        "appliance": "Washer",
        "issue": "Error code E4 on display",
        "status": "scheduled",
        "travel": 45,
    },
    {
        "day_offset": 1,
        "hour": 15,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Ben Castillo",
        "phone": "555-0290",
        "address": "55 Kern St, Taft, CA 93268",
        "notes": None,
        "appliance": "Oven / Range",
        "issue": "Burners uneven heat",
        "status": "scheduled",
        "travel": 40,
    },
    # Wednesday
    {
        "day_offset": 2,
        "hour": 9,
        "minute": 0,
        "tech": "Alex Rivera",
        "name": "Nina Patel",
        "phone": "555-0301",
        "address": "760 G Street, Wasco, CA 93280",
        "notes": None,
        "appliance": "Refrigerator",
        "issue": "Warm fridge, freezer OK",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 2,
        "hour": 11,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Ryan Cooper",
        "phone": "555-0312",
        "address": "2100 River Blvd, Bakersfield, CA 93311",
        "notes": "Side gate unlocked",
        "appliance": "Washer",
        "issue": "Won't spin — clothes soaked",
        "status": "scheduled",
        "travel": 40,
    },
    {
        "day_offset": 2,
        "hour": 14,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Grace Kim",
        "phone": "555-0323",
        "address": "980 Cecil Ave, Delano, CA 93215",
        "notes": None,
        "appliance": "Dryer",
        "issue": "Belt squealing loudly",
        "status": "scheduled",
        "travel": 45,
    },
    {
        "day_offset": 2,
        "hour": 8,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Marco Silva",
        "phone": "555-0334",
        "address": "318 Lerdo Hwy, Shafter, CA 93263",
        "notes": None,
        "appliance": "Dishwasher",
        "issue": "Leaves residue on glasses",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 2,
        "hour": 11,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Jill Avery",
        "phone": "555-0345",
        "address": "1400 California Ave, Bakersfield, CA 93304",
        "notes": None,
        "appliance": "Microwave",
        "issue": "Turntable not spinning",
        "status": "scheduled",
        "travel": 35,
    },
    {
        "day_offset": 2,
        "hour": 14,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Hector Ruiz",
        "phone": "555-0356",
        "address": "70 Supply Row, Taft, CA 93268",
        "notes": "Shop entrance",
        "appliance": "Oven / Range",
        "issue": "Self-clean lock stuck",
        "status": "scheduled",
        "travel": 45,
    },
    # Thursday
    {
        "day_offset": 3,
        "hour": 9,
        "minute": 0,
        "tech": "Alex Rivera",
        "name": "Katie Morgan",
        "phone": "555-0367",
        "address": "550 Albany St, Delano, CA 93215",
        "notes": None,
        "appliance": "Washer",
        "issue": "Shakes violently on spin",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 3,
        "hour": 11,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Diego Morales",
        "phone": "555-0378",
        "address": "235 Mannel Ave, Shafter, CA 93263",
        "notes": None,
        "appliance": "Refrigerator",
        "issue": "Water dispenser dripping",
        "status": "scheduled",
        "travel": 35,
    },
    {
        "day_offset": 3,
        "hour": 14,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Amy Foster",
        "phone": "555-0389",
        "address": "4100 Stockdale Hwy, Bakersfield, CA 93309",
        "notes": "Office suite 110",
        "appliance": "Dishwasher",
        "issue": "Door won't latch",
        "status": "scheduled",
        "travel": 40,
    },
    {
        "day_offset": 3,
        "hour": 9,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Victor Chen",
        "phone": "555-0400",
        "address": "180 Poso Dr, Wasco, CA 93280",
        "notes": None,
        "appliance": "Dryer",
        "issue": "Lint trap sensor fault",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 3,
        "hour": 12,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Laura Bennett",
        "phone": "555-0411",
        "address": "95 Cascade Rd, Taft, CA 93268",
        "notes": "Long driveway",
        "appliance": "Washer",
        "issue": "Fills slowly then stops",
        "status": "scheduled",
        "travel": 45,
    },
    {
        "day_offset": 3,
        "hour": 15,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Sam Ortiz",
        "phone": "555-0422",
        "address": "2600 Rosedale Hwy, Bakersfield, CA 93308",
        "notes": None,
        "appliance": "Oven / Range",
        "issue": "Clock panel blank",
        "status": "scheduled",
        "travel": 40,
    },
    # Friday
    {
        "day_offset": 4,
        "hour": 8,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Megan Doyle",
        "phone": "555-0433",
        "address": "3200 Lake St, Bakersfield, CA 93306",
        "notes": None,
        "appliance": "Refrigerator",
        "issue": "Compressor running constantly",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 4,
        "hour": 11,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Frank Gibson",
        "phone": "555-0444",
        "address": "48 Kern Ave, Taft, CA 93268",
        "notes": None,
        "appliance": "Washer",
        "issue": "Door seal torn",
        "status": "scheduled",
        "travel": 45,
    },
    {
        "day_offset": 4,
        "hour": 14,
        "minute": 30,
        "tech": "Alex Rivera",
        "name": "Isabel Cruz",
        "phone": "555-0455",
        "address": "870 Ellington St, Delano, CA 93215",
        "notes": "Ring doorbell twice",
        "appliance": "Dryer",
        "issue": "Won't start — clicking relay",
        "status": "scheduled",
        "travel": 45,
    },
    {
        "day_offset": 4,
        "hour": 9,
        "minute": 0,
        "tech": "Jordan Lee",
        "name": "Paul Jensen",
        "phone": "555-0466",
        "address": "615 Fresno Ave, Shafter, CA 93263",
        "notes": None,
        "appliance": "Dishwasher",
        "issue": "Spray arm seized",
        "status": "confirmed",
        "travel": 30,
    },
    {
        "day_offset": 4,
        "hour": 11,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Rita Gomez",
        "phone": "555-0477",
        "address": "1020 Filburn St, Wasco, CA 93280",
        "notes": None,
        "appliance": "Microwave",
        "issue": "Door switch intermittent",
        "status": "scheduled",
        "travel": 35,
    },
    {
        "day_offset": 4,
        "hour": 14,
        "minute": 30,
        "tech": "Jordan Lee",
        "name": "Noah Blake",
        "phone": "555-0488",
        "address": "1550 Oak St, Bakersfield, CA 93304",
        "notes": None,
        "appliance": "Oven / Range",
        "issue": "Broiler element out",
        "status": "scheduled",
        "travel": 40,
    },
]


def _week_monday(now: datetime | None = None) -> datetime:
    """Return Monday 00:00 of the current local week."""
    now = now or datetime.now()
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight - timedelta(days=midnight.weekday())


# Canonical demo barbers (stored as technicians). Seed jobs key by `name`.
_SEED_TECHS = (
    {"name": "Angel", "aliases": (), "color": "#111111", "start_location": "Chair 1"},
    {"name": "Ari", "aliases": (), "color": "#333333", "start_location": "Chair 2"},
    {"name": "Carlos", "aliases": (), "color": "#555555", "start_location": "Chair 3"},
    {"name": "Charlie", "aliases": (), "color": "#1a1a1a", "start_location": "Chair 4"},
    {"name": "Fabian", "aliases": (), "color": "#2a2a2a", "start_location": "Chair 5"},
    {"name": "Ismael", "aliases": (), "color": "#3a3a3a", "start_location": "Chair 6"},
    {"name": "Joseph", "aliases": (), "color": "#4a4a4a", "start_location": "Chair 7"},
    {"name": "Vincent", "aliases": (), "color": "#222222", "start_location": "Chair 8"},
    {"name": "Zach", "aliases": (), "color": "#444444", "start_location": "Chair 9"},
)

_SEED_SERVICES = (
    {
        "name": "Kids 12 And Under",
        "description": "For Little Johnnys Fresh Fade",
        "duration_minutes": 30,
        "price_cents": 3500,
        "sort_order": 0,
    },
    {
        "name": "Haircut And Beard",
        "description": "Fade Or Taper. Beard Line Up And Cleanup.",
        "duration_minutes": 50,
        "price_cents": 5500,
        "sort_order": 1,
    },
    {
        "name": "Haircut",
        "description": "Fades And Tapers.",
        "duration_minutes": 30,
        "price_cents": 4000,
        "sort_order": 2,
    },
    {
        "name": "Beard",
        "description": "Beard Cleanup.",
        "duration_minutes": 20,
        "price_cents": 2500,
        "sort_order": 3,
    },
)


def _find_seed_technician(existing: list[Technician], spec: dict) -> Technician | None:
    names = {spec["name"], *spec.get("aliases", ())}
    for tech in existing:
        if tech.name in names:
            return tech
    color = spec["color"].upper()
    loc = spec["start_location"]
    for tech in existing:
        if tech.color.upper() == color and tech.start_location == loc:
            return tech
    return None


def ensure_technicians(db: Session) -> dict[str, Technician]:
    """Return seed techs keyed by canonical name (and actual name). Never clones renamed rows."""
    existing = list(db.query(Technician).all())
    by_name: dict[str, Technician] = {}
    canonical: list[Technician] = []

    for spec in _SEED_TECHS:
        tech = _find_seed_technician(existing, spec)
        if not tech:
            from app.team import next_tech_sort_order

            tech = Technician(
                name=spec["name"],
                color=spec["color"],
                start_location=spec["start_location"],
                active=1,
                sort_order=next_tech_sort_order(db),
                work_start="09:00",
                work_end="18:00",
                work_days="1,2,3,4,5,6,7",
            )
            db.add(tech)
            db.flush()
            existing.append(tech)
        by_name[spec["name"]] = tech
        by_name[tech.name] = tech
        canonical.append(tech)

    # Drop inactive seed clones with no history (rename + re-seed left these behind).
    canonical_ids = {t.id for t in canonical}
    for tech in list(existing):
        if tech.id in canonical_ids or tech.active:
            continue
        matched = any(
            tech.color.upper() == spec["color"].upper()
            and tech.start_location == spec["start_location"]
            for spec in _SEED_TECHS
        )
        if not matched:
            continue
        has_jobs = (
            db.query(Appointment.id)
            .filter(Appointment.technician_id == tech.id)
            .limit(1)
            .first()
        )
        if has_jobs:
            continue
        db.delete(tech)
        by_name.pop(tech.name, None)

    db.flush()
    return by_name


def seed_week_scenario(db: Session, *, clear_existing: bool = False) -> None:
    """Load this week's multi-city Central Valley demo bookings."""
    techs = ensure_technicians(db)

    if clear_existing:
        db.query(Appointment).delete()
        db.query(Customer).delete()
        db.flush()
    elif db.query(Appointment).count() > 0:
        return

    monday = _week_monday()
    customers_by_phone: dict[str, Customer] = {}

    for idx, job in enumerate(SAMPLE_JOBS):
        phone = job["phone"]
        customer = customers_by_phone.get(phone)
        if not customer:
            customer = Customer(
                name=job["name"],
                phone=phone,
                address=job["address"],
                notes=job["notes"],
            )
            db.add(customer)
            db.flush()
            customers_by_phone[phone] = customer

        tech = techs[job["tech"]]
        starts = monday + timedelta(
            days=job["day_offset"],
            hours=job["hour"],
            minutes=job["minute"],
        )
        job_type = job.get("job_type") or JOB_TYPES[idx % len(JOB_TYPES)]
        db.add(
            Appointment(
                customer_id=customer.id,
                technician_id=tech.id,
                starts_at=starts,
                duration_minutes=default_duration_for_job_type(job_type),
                travel_buffer_minutes=job.get("travel", DEFAULT_TRAVEL_BUFFER),
                appliance=job["appliance"],
                job_type=job_type,
                issue=job["issue"],
                status=job["status"],
            )
        )

    db.commit()


def _fake_phone(rng: random.Random, used: set[str]) -> str:
    for _ in range(40):
        phone = f"555-{rng.randint(1000, 9999)}"
        if phone not in used:
            used.add(phone)
            return phone
    phone = f"555-{len(used) + 1000:04d}"
    used.add(phone)
    return phone


def _fake_address(rng: random.Random) -> str:
    city, state, zip_code = rng.choice(CITIES)
    num = rng.randint(100, 2999)
    street = rng.choice(STREETS)
    return f"{num} {street}, {city}, {state} {zip_code}"


def _status_for_day(day: date, today: date, rng: random.Random) -> str:
    if day < today - timedelta(days=2):
        # Past: mostly completed, some cancelled / leftover scheduled.
        roll = rng.random()
        if roll < 0.78:
            return "completed"
        if roll < 0.90:
            return "cancelled"
        return "confirmed" if roll < 0.95 else "scheduled"
    if day < today:
        roll = rng.random()
        if roll < 0.45:
            return "completed"
        if roll < 0.55:
            return "cancelled"
        return "confirmed" if roll < 0.8 else "scheduled"
    if day == today:
        return rng.choice(["confirmed", "confirmed", "scheduled", "scheduled"])
    # Future
    return "confirmed" if rng.random() < 0.55 else "scheduled"


def _duration_for_job_type(job_type: str, rng: random.Random) -> int:
    base = default_duration_for_job_type(job_type)
    jitter = rng.choice((-15, 0, 0, 15, 30))
    return max(45, min(180, base + jitter))


def _travel_for_city(address: str, rng: random.Random) -> int:
    if "Bakersfield" in address:
        return rng.choice((20, 25, 30, 30))
    if "Shafter" in address or "Wasco" in address:
        return rng.choice((30, 35, 40))
    if "Taft" in address or "Delano" in address:
        return rng.choice((35, 40, 45, 50))
    return DEFAULT_TRAVEL_BUFFER


def _pick_spaced_slots(
    slots: tuple[tuple[int, int], ...],
    n_jobs: int,
    rng: random.Random,
) -> list[tuple[int, int]]:
    """Pick n start times, preferring spread-out gaps over clustered back-to-backs."""
    if n_jobs <= 0:
        return []
    slot_list = list(slots)
    if n_jobs >= len(slot_list):
        return slot_list

    # Prefer index patterns that leave visible open blocks (esp. for 2 of 4).
    if len(slot_list) == 4 and n_jobs == 2:
        pairs = ((0, 2), (0, 3), (1, 3), (0, 2), (1, 3))
        i, j = rng.choice(pairs)
        return [slot_list[i], slot_list[j]]
    if len(slot_list) == 4 and n_jobs == 1:
        return [rng.choice(slot_list)]
    if len(slot_list) == 4 and n_jobs == 3:
        drop = rng.choice((0, 1, 2, 3))
        return [s for idx, s in enumerate(slot_list) if idx != drop]

    # 8 weekday slots at ~half capacity: pick every other-ish index.
    if len(slot_list) >= 6 and 2 <= n_jobs <= len(slot_list) - 2:
        step = max(1, len(slot_list) // n_jobs)
        start = rng.randrange(0, step)
        picked = []
        i = start
        while len(picked) < n_jobs and i < len(slot_list):
            picked.append(slot_list[i])
            i += step
        if len(picked) < n_jobs:
            remaining = [s for s in slot_list if s not in picked]
            rng.shuffle(remaining)
            picked.extend(remaining[: n_jobs - len(picked)])
        return sorted(picked)

    chosen = list(slot_list)
    rng.shuffle(chosen)
    return sorted(chosen[:n_jobs])


def seed_year_scenario(
    db: Session,
    *,
    clear_existing: bool = False,
    days_back: int = 365,
    days_forward: int = 14,
) -> int:
    """
    Generate ~1 year of Exclusive Studio cuts for active barbers.
    Weekdays aim for ~half chair capacity so Day/Week boards show open gaps;
    includes past (completed) and live/upcoming (scheduled/confirmed) bookings.
    """
    ensure_services(db)
    techs_by_name = ensure_technicians(db)
    unique = {t.id: t for t in techs_by_name.values()}
    active_techs = [t for t in unique.values() if getattr(t, "active", 1)]
    if not active_techs:
        active_techs = list(unique.values())

    if clear_existing:
        db.query(Appointment).delete()
        db.query(Customer).delete()
        db.flush()
    elif db.query(Appointment).count() > 0:
        return 0

    today = date.today()
    start_day = today - timedelta(days=days_back)
    end_day = today + timedelta(days=days_forward)
    used_phones: set[str] = set()
    customers: list[Customer] = []
    created = 0

    pool_rng = random.Random(42)
    for _ in range(80):
        phone = _fake_phone(pool_rng, used_phones)
        cust = Customer(
            name=f"{pool_rng.choice(FIRST_NAMES)} {pool_rng.choice(LAST_NAMES)}",
            phone=phone,
            address=_fake_address(pool_rng),
            notes=None,
        )
        db.add(cust)
        customers.append(cust)
    db.flush()

    day = start_day
    while day <= end_day:
        day_rng = random.Random(day.toordinal() * 9973 + 17)
        weekend = day.weekday() >= 5
        slots = WEEKEND_SLOTS if weekend else WEEKDAY_SLOTS

        for tech in active_techs:
            if weekend:
                n_jobs = day_rng.choice((0, 0, 1, 1, 2, 2))
            else:
                # ~Half of 8 weekday slots filled → visible open chair time.
                n_jobs = day_rng.choice((3, 4, 4, 4, 5))

            chosen_slots = _pick_spaced_slots(slots, n_jobs, day_rng)

            for hour, minute in chosen_slots:
                if hour < WORKDAY_START_HOUR or hour >= WORKDAY_END_HOUR:
                    continue
                starts = datetime(day.year, day.month, day.day, hour, minute)
                service_name, job_type, duration = day_rng.choice(_CUT_SERVICES)
                if customers and day_rng.random() < 0.6:
                    customer = day_rng.choice(customers)
                else:
                    phone = _fake_phone(day_rng, used_phones)
                    customer = Customer(
                        name=f"{day_rng.choice(FIRST_NAMES)} {day_rng.choice(LAST_NAMES)}",
                        phone=phone,
                        address=_fake_address(day_rng),
                        notes=day_rng.choice(_CUT_NOTES),
                    )
                    db.add(customer)
                    db.flush()
                    customers.append(customer)

                status = _status_for_day(day, today, day_rng)
                note = day_rng.choice(_CUT_NOTES)

                db.add(
                    Appointment(
                        customer_id=customer.id,
                        technician_id=tech.id,
                        starts_at=starts,
                        duration_minutes=duration,
                        travel_buffer_minutes=0,
                        appliance=service_name,
                        job_type=job_type,
                        issue=note or service_name,
                        status=status,
                    )
                )
                created += 1

        day += timedelta(days=1)

    db.commit()
    return created


def ensure_services(db: Session) -> list[Service]:
    """Seed or refresh the Exclusive Barber Studio service menu."""
    existing = db.query(Service).order_by(Service.sort_order, Service.id).all()
    by_order = {s.sort_order: s for s in existing}
    for spec in _SEED_SERVICES:
        row = by_order.get(spec["sort_order"])
        if row:
            row.name = spec["name"]
            row.description = spec["description"]
            row.duration_minutes = spec["duration_minutes"]
            row.price_cents = spec["price_cents"]
            row.active = 1
        else:
            db.add(
                Service(
                    name=spec["name"],
                    description=spec["description"],
                    duration_minutes=spec["duration_minutes"],
                    price_cents=spec["price_cents"],
                    sort_order=spec["sort_order"],
                    active=1,
                )
            )
    db.flush()
    return db.query(Service).order_by(Service.sort_order, Service.id).all()


def seed_if_empty(db: Session) -> None:
    """First launch: barbers + services + half-capacity live/past cuts when empty."""
    ensure_technicians(db)
    ensure_services(db)
    if db.query(Appointment).count() == 0:
        seed_year_scenario(db, clear_existing=False)
    db.commit()


def reseed_week(db: Session) -> None:
    """Replace sample appointments/customers with this week's scenario."""
    seed_week_scenario(db, clear_existing=True)


def reseed_year(db: Session) -> int:
    """Replace all appointments/customers with ~1 year of demo data (idempotent clear)."""
    return seed_year_scenario(db, clear_existing=True)
