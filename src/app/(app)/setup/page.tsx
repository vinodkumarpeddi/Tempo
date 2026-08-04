"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CopyBlock from "@/components/CopyBlock";
import PageHeader from "@/components/PageHeader";

function Step({
  n,
  title,
  last = false,
  children,
}: {
  n: string;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {n}
        </span>
        {!last && <span className="bg-border mt-2 w-px flex-1" />}
      </div>
      <div className="min-w-0 flex-1 pb-9">
        <h3 className="mb-1.5 pt-0.5 font-medium">{title}</h3>
        <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const [joinCode, setJoinCode] = useState("");
  const [origin, setOrigin] = useState("https://your-server");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/settings").then(async (res) => {
      if (res.ok) setJoinCode((await res.json()).settings.joinCode ?? "");
    });
  }, []);

  const teamCmd = `curl -sSL ${origin}/j/${joinCode || "<code>"} | bash`;

  return (
    <>
      <PageHeader
        title="Setup guide"
        description="Three steps to a fully reporting team"
      ></PageHeader>
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="border-border bg-card mb-10 overflow-hidden rounded-2xl border">
          <div className="px-6 pt-5 pb-4">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight">Team install command</h2>
              <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                one command for everyone
              </span>
            </div>
            <p className="text-muted-foreground text-[13px]">
              Drop this in your team chat. It detects each person&apos;s Claude account
              automatically and reports <b>only usage percentages</b> — tokens never leave
              their machine.
            </p>
          </div>
          <div className="px-6 pb-5">
            <CopyBlock text={teamCmd} />
          </div>
        </div>

        <Step n="1" title="Everyone runs it once">
          <p>
            Pasted into a terminal on the machine where they use Claude Code — that&apos;s the
            only thing a member ever does. Reporting starts immediately and survives restarts.
          </p>
          <p className="text-xs">
            macOS shows a one-time Keychain prompt for &quot;Claude Code-credentials&quot; →
            click <b>Always Allow</b>.
          </p>
        </Step>

        <Step n="2" title="Watch the dashboard fill in">
          <p>
            Each person appears on the{" "}
            <Link href="/dashboard" className="text-primary font-medium underline underline-offset-4">
              Dashboard
            </Link>{" "}
            after their first report — meters, reset dates, and daily peaks, sorted by who has
            the most capacity left.
          </p>
        </Step>

        <Step n="3" title="Tune cadence, reports, and alerts" last>
          <p>
            In{" "}
            <Link href="/settings" className="text-primary font-medium underline underline-offset-4">
              Settings
            </Link>
            : how often machines report, exact report times on the days you choose, inline or
            PDF format, and warn/critical thresholds. Every change reaches all machines
            automatically.
          </p>
        </Step>

        <div className="border-border/70 mt-2 border-t pt-8">
          <h3 className="mb-1.5 text-sm font-medium">Deploying to a server?</h3>
          <p className="text-muted-foreground mb-3 text-sm">
            Set the email credentials, then let cron trigger reports (safe to call every few
            minutes — each configured time sends exactly once):
          </p>
          <CopyBlock
            text={`# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<app password>
EMAIL_FROM="Brimly <you@gmail.com>"
APP_URL=https://your-server

# crontab
*/5 * * * * curl -s "https://your-server/api/cron/daily?secret=$CRON_SECRET"`}
          />
        </div>
      </main>
    </>
  );
}
