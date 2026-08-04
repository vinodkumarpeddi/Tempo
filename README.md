# claude-team-usage

Team dashboard for Claude subscription limits. Each member's machine reports its
session (5-hour) and weekly limit utilization; the server shows a live dashboard,
sends a daily email report, and alerts people when they cross usage thresholds or
when their limits reset.

## How it works

```
dev machine (each member)              server (this app)                 email
┌─────────────────────────┐   HTTPS   ┌───────────────────────┐  Resend ┌─────────┐
│ collector.sh            │ ────────▶ │ POST /api/ingest      │ ──────▶ │ daily   │
│ launchd/cron 10min tick │           │ SQLite via Prisma     │         │ report, │
│ reads Claude Code OAuth │           │ Next.js dashboard     │         │ alerts  │
│ token locally, sends    │           │ admin settings        │         └─────────┘
│ only usage percentages  │           └───────────────────────┘
└─────────────────────────┘
```

- The collector reads the OAuth token Claude Code already stores locally
  (macOS Keychain / `~/.claude/.credentials.json`), calls
  `https://api.anthropic.com/api/oauth/usage`, and POSTs **only the percentages**
  to this server. The token never leaves the member's machine.
- Collectors tick every 10 minutes but ask `/api/collector/config` whether a
  report is due — so the reporting interval (15m/30m/1h/2h) is set in the admin
  page and applies to every machine without reinstalling anything.
- Alerts are evaluated at ingest time: threshold crossings (warn/critical) and
  window resets are emailed immediately, deduped per window via `AlertLog`.
- The daily report is sent by `/api/cron/daily` at the configured UTC hour, as an
  inline HTML table or a PDF attachment (admin setting).
- UI is built on the EverHr design system (components copied into
  `src/components/ui`, tokens in `src/app/globals.css`).

> ⚠️ The usage endpoint is **undocumented** — Anthropic may change it. The
> tolerant parser (`src/lib/usage.ts`) falls back to the `limits` array, stores
> the raw payload on every snapshot for debugging, and the dashboard shows a
> `stale` badge when a machine stops reporting.

## Setup

```sh
npm install
npx prisma migrate dev
npm run dev
```

Configure `.env` (see `.env.example`):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file by default. For serverless deploys switch the Prisma provider to Postgres. |
| `ADMIN_SECRET` | Password for `/admin` and the admin API. |
| `CRON_SECRET` | Auth for `/api/cron/daily`. |
| `RESEND_API_KEY` | Resend key; emails are skipped (logged) while empty. |
| `EMAIL_FROM` | e.g. `Claude Usage <usage@yourdomain.com>` (domain verified in Resend). |
| `APP_URL` | Public URL, linked in emails. |

## Onboarding a team member

1. Open `/admin` → **Add member** (name + email).
2. Copy their install command and send it to them:
   ```sh
   curl -sSL https://your-server/install.sh | bash -s -- https://your-server ctu_xxx
   ```
3. The installer sets up a launchd agent (macOS) or crontab entry (Linux) and
   sends the first report. On macOS the first run may show a Keychain prompt for
   "Claude Code-credentials" — click **Always Allow**.

## Scheduling the daily report

`/api/cron/daily` is safe to call hourly; it only sends at the configured hour,
at most once per day.

- **VPS / Docker:** `0 * * * * curl -s "https://your-server/api/cron/daily?secret=$CRON_SECRET"`
- **Vercel:** add a `vercel.json` cron for `/api/cron/daily?secret=...` (hourly on
  Pro; on Hobby schedule it daily at the hour configured in admin). Switch the
  database to Postgres (e.g. Neon) first — SQLite does not persist on serverless.

Test from the admin page with **Send test report now** (uses `?force=1`).

## Admin settings

- Collector interval: 15 min / 30 min / 1 h / 2 h — applies to all machines
- Daily report time (UTC hour) and format (inline table or PDF attachment)
- Warn / critical thresholds (default 80% / 95%)
- Admin email CC'd on reports and alerts; per-feature enable toggles
- Member management: install command, disable, regenerate key, remove

## Uninstalling a collector (member machine)

```sh
launchctl unload ~/Library/LaunchAgents/com.claude-team-usage.collector.plist   # macOS
crontab -l | grep -v claude-usage-collector | crontab -                          # Linux
rm -rf ~/.claude-usage-collector
```
