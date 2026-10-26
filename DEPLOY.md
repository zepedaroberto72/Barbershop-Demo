# Deploy Barbershop Demo (Railway)

Goal: public HTTPS for the **customer site** (`/book`) so phones don’t need your laptop Wi‑Fi.  
Staff desk is on the same app at `/` — you can ignore it until the customer site looks good.

Suggested GitHub repo name: **`barbershop-demo`** (private is fine).

## 1. Push to GitHub

From this folder (after `git` is initialized and committed):

1. Create a new repo on GitHub named **`barbershop-demo`** (no README).
2. Push:

```bash
cd ~/Desktop/Barber\ Bookings
git remote add origin https://github.com/YOUR_USERNAME/barbershop-demo.git
git branch -M main
git push -u origin main
```

## 2. Create a Railway project

1. Open [https://railway.app](https://railway.app) and sign up (GitHub login).
2. **New project** → **Deploy from GitHub repo** → **`barbershop-demo`**.
3. Railway uses the included `Dockerfile` / `railway.toml`.

## 3. Required environment variables

Railway → your service → **Variables**:

| Variable | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `SESSION_SECRET` | long random string (`openssl rand -hex 32`) |
| `AUTH_DISABLED` | `0` |
| `DATABASE_URL` | `sqlite:////data/bookings.db` |
| `SENDGRID_API_KEY` | your SendGrid key (for `/interested` emails) |
| `EMAIL_FROM` | verified SendGrid sender |
| `EMAIL_FROM_NAME` | `Barbershop Demo` (optional) |
| `INTEREST_NOTIFY_EMAIL` | optional; defaults to your notify address |
| `TWILIO_*` | optional until SMS is ready |

## 4. Persistent disk (SQLite)

Service → **Settings** → **Volumes** → mount at **`/data`**.

Without this, demo bookings disappear when the app restarts.

## 5. Public URL — check customer site first

Settings → **Networking** → **Generate domain**.

**Verify these first:**

- Customer book: `https://YOUR-APP.up.railway.app/book`
- Interest form: `https://YOUR-APP.up.railway.app/interested`

Staff (when you’re ready): `https://YOUR-APP.up.railway.app/`  
Default login: `admin` / `admin123` — change after first login.

## 6. CLI alternative

```bash
railway login
cd ~/Desktop/Barber\ Bookings
railway link   # or railway init
railway up
```

Still add the `/data` volume and variables in the dashboard, then generate a domain.

## Notes

- Same deploy serves customer + staff; focus QA on `/book` first.
- Custom domain later: Railway → Settings → Domains.
- Laptop keep working with `./start.sh` as before.
