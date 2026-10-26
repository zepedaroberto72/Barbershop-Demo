#!/bin/zsh
# Start Barber Shop on this laptop.
# Staff:  http://127.0.0.1:8002
# Book:   http://127.0.0.1:8002/book
#
# Optional SMS / email — put secrets in a local .env (never commit).
# See .env.example.

cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
echo "Barber Shop (staff) → http://127.0.0.1:8002"
echo "Barber Shop (book)  → http://127.0.0.1:8002/book"
if [ -n "$LAN_IP" ]; then
  echo "On phone (same Wi‑Fi) → http://${LAN_IP}:8002"
fi
echo "Leave this window open while you use the app. Ctrl+C to stop."
exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port "${PORT:-8002}"
