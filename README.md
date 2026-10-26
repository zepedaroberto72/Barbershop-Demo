# Barbershop Demo

Demo barbershop booking app: **customer booking site** (`/book`) plus a staff desk (`/`).

This repo is for the **demo** — get the customer site live first; staff desk comes along on the same deploy.

## Customer site (priority)

| Where | URL |
| --- | --- |
| Local | [http://127.0.0.1:8002/book](http://127.0.0.1:8002/book) |
| Production | `https://YOUR-APP.up.railway.app/book` |

Also: `/interested` (Want this for your shop?), `/privacy`, `/terms`.

## Daily use (laptop)

```bash
cd ~/Desktop/Barber\ Bookings
./start.sh
```

- **Customer:** [http://127.0.0.1:8002/book](http://127.0.0.1:8002/book)
- **Staff (later):** [http://127.0.0.1:8002](http://127.0.0.1:8002) — `admin` / `admin123` (change after first login)

Leave Terminal open; `Ctrl+C` to stop. If permission denied: `chmod +x start.sh`.

## Deploy

See [DEPLOY.md](DEPLOY.md) — GitHub → Railway, then verify **`/book`** first.

## Optional SMS / email

See `.env.example`. Never commit `.env`.
