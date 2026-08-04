# Deploying Tempo to Vercel

Resend works as-is on Vercel. Two things change versus local dev: the database
(SQLite → Postgres) and how the report cron fires.

## 1. Database — switch to Postgres

SQLite is a file; Vercel's serverless filesystem doesn't persist it. Use a free
Postgres from [Neon](https://neon.tech) (or Vercel Postgres — same steps).

1. Create a Neon project → copy the connection string (`postgresql://...`).
2. In `prisma/schema.prisma`, change the datasource:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. The existing migrations are SQLite-flavored — regenerate once for Postgres:

   ```sh
   rm -rf prisma/migrations
   DATABASE_URL="postgresql://...neon..." npx prisma migrate dev --name init
   ```

4. Commit the schema + new migrations. (Local dev now also uses Neon — a free
   branch database works fine for dev.)

Production starts empty: sign up again at `/signup`, and members appear as their
collectors report to the new URL.

## 2. Deploy

```sh
npx vercel        # link the repo, first deploy
npx vercel --prod
```

Set these in Vercel → Project → Settings → Environment Variables:

| Var | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string |
| `ADMIN_SECRET` | a long random string |
| `CRON_SECRET`  | a long random string |
| `RESEND_API_KEY` | your Resend key |
| `EMAIL_FROM` | `Tempo <usage@your-verified-domain.com>` |
| `APP_URL` | `https://your-app.vercel.app` (or your custom domain) |

`APP_URL` matters: the team join command, onboarding emails, and report links
are all built from it.

Vercel Cron requests send `Authorization: Bearer` with Vercel's own token — our
endpoint instead accepts `?secret=`, so the cron path in `vercel.json` relies on
`CRON_SECRET` being passed. Edit `vercel.json`'s path to include it:

```json
{ "path": "/api/cron/daily?secret=YOUR_CRON_SECRET", "schedule": "0 9 * * *" }
```

## 3. Report scheduling

The endpoint is designed to be pinged every ~5 minutes; each configured
time/day sends exactly once, with catch-up.

- **Vercel Hobby (free)**: crons run at most once per day — fine for a single
  daily report, but exact multi-times need an external pinger. Free option:
  [cron-job.org](https://cron-job.org) hitting
  `https://your-app.vercel.app/api/cron/daily?secret=...` every 5 minutes.
  (A GitHub Actions `schedule` workflow works too.)
- **Vercel Pro**: change the `vercel.json` schedule to `*/5 * * * *` and you're
  done — no external service.

## 4. Repoint the collectors

Each member machine's config points at the old URL. Re-run the (new) team join
command once per machine:

```sh
curl -sSL https://your-app.vercel.app/j/<code> | bash
```

(the code is in Setup guide → it regenerates per database, so fetch it from the
deployed app, not localhost).

## 5. Production email — no domain needed

A `*.vercel.app` domain **cannot** be verified in Resend (you don't control
vercel.app's DNS), so pick one of:

**A. Gmail SMTP (recommended when you own no domain).** Sends to every member,
no domain required. On the Gmail account: enable 2-step verification, then
create an App Password (myaccount.google.com/apppasswords). Set:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char app password>
EMAIL_FROM="Tempo <you@gmail.com>"
```

SMTP wins over Resend whenever it's configured.

**B. Resend test mode.** Zero setup, but delivers only to the Resend account
owner's inbox — fine if only the admin reads the reports.

**C. Buy a domain (~$10/yr)** and verify it in Resend for the cleanest
deliverability at scale.
