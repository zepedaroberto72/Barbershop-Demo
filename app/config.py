import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Laptop default: local SQLite file. Override with DATABASE_URL when you deploy later.
_default_sqlite = f"sqlite:///{BASE_DIR / 'data' / 'bookings.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", _default_sqlite)

# Hosts like Railway/Render set PORT; on a laptop we default to 8002
# so this Barber Shop app can run beside Repair Desk on 8001.
PORT = int(os.getenv("PORT", "8002"))
HOST = os.getenv("HOST", "127.0.0.1")

# Production / HTTPS (Railway, Render, etc.): set ENVIRONMENT=production
_ENV_RAW = os.getenv("ENVIRONMENT", "").strip().lower()
IS_PRODUCTION = _ENV_RAW in {"production", "prod", "railway", "render", "fly"}

# Signed session cookie secret. Set SESSION_SECRET in production; a stable local
# fallback lives in data/.session_secret so restarts keep you logged in.
def _session_secret() -> str:
    env = os.getenv("SESSION_SECRET", "").strip()
    if env:
        return env
    secret_path = BASE_DIR / "data" / ".session_secret"
    try:
        secret_path.parent.mkdir(parents=True, exist_ok=True)
        if secret_path.is_file():
            stored = secret_path.read_text(encoding="utf-8").strip()
            if stored:
                return stored
        stored = secrets.token_urlsafe(48)
        secret_path.write_text(stored, encoding="utf-8")
        return stored
    except OSError:
        return secrets.token_urlsafe(48)


SESSION_SECRET = _session_secret()

# Temporary password-login bypass for local desk use.
# Set AUTH_DISABLED=1 (or true/yes/on) to skip login and act as Admin.
# Turn auth back on: unset the flag or set AUTH_DISABLED=0, then restart.
_AUTH_DISABLED_RAW = os.getenv("AUTH_DISABLED", "").strip().lower()
AUTH_DISABLED = _AUTH_DISABLED_RAW in {"1", "true", "yes", "on"}

# Scheduling defaults (minutes). Prefer JOB_TYPE_DEFAULT_DURATION for job-specific defaults.
DEFAULT_JOB_DURATION = 120
DEFAULT_TRAVEL_BUFFER = 30
WORKDAY_START_HOUR = 8
WORKDAY_END_HOUR = 18
SLOT_STEP_MINUTES = 30

# Twilio booking SMS (optional — missing creds skips SMS, booking still succeeds).
# Set via env or a local .env sourced by start.sh: TWILIO_ACCOUNT_SID,
# TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER. Optional: SMS_ON_BOOKING=0 to disable,
# BUSINESS_NAME (default "Barber Shop").
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()
SMS_ON_BOOKING = os.getenv("SMS_ON_BOOKING", "").strip()
BUSINESS_NAME = os.getenv("BUSINESS_NAME", "Exclusive Barber Studio").strip() or "Exclusive Barber Studio"

# Customer booking site (/book) — shop profile shown on the service menu.
SHOP_TAGLINE = os.getenv("SHOP_TAGLINE", "Exclusive Barber Studio").strip() or "Exclusive Barber Studio"
SHOP_ADDRESS = os.getenv(
    "SHOP_ADDRESS", "1214 W Ave K, Lancaster, CA 93534"
).strip() or "1214 W Ave K, Lancaster, CA 93534"
SHOP_PHONE = os.getenv("SHOP_PHONE", "+1 661-571-0244").strip() or "+1 661-571-0244"
SHOP_EMAIL = os.getenv("SHOP_EMAIL", "").strip()
SHOP_HOURS = (
    ("Monday", "9:00 AM – 6:00 PM"),
    ("Tuesday", "9:00 AM – 6:00 PM"),
    ("Wednesday", "9:00 AM – 6:00 PM"),
    ("Thursday", "9:00 AM – 6:00 PM"),
    ("Friday", "9:00 AM – 6:00 PM"),
    ("Saturday", "8:30 AM – 5:00 PM"),
    ("Sunday", "10:00 AM – 4:00 PM"),
)

# How long checkout holds the selected slot (shown on /book; editable in Settings).
BOOKING_HOLD_MINUTES = int(os.getenv("BOOKING_HOLD_MINUTES", "10") or "10")

# Optional outbound email via SendGrid (password reset + invoice share + /interested leads).
# Missing SENDGRID_API_KEY / EMAIL_FROM skips send; UI still works.
# EMAIL_FROM must match a verified Single Sender (or authenticated domain) in SendGrid.
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip()
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "").strip()

# Recipient for "Want this for your shop?" (/interested) lead emails.
# Override with INTEREST_NOTIFY_EMAIL; default is the project owner inbox.
INTEREST_NOTIFY_EMAIL = (
    os.getenv("INTEREST_NOTIFY_EMAIL", "zepedaroberto72@gmail.com").strip()
    or "zepedaroberto72@gmail.com"
)
