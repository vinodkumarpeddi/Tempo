"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [teamKey, setTeamKey] = useState("");
  const [origin, setOrigin] = useState("https://your-server");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/settings").then(async (res) => {
      if (res.ok) setTeamKey((await res.json()).settings.teamKey ?? "");
    });
  }, []);

  const teamCmd = `curl -sSL ${origin}/install.sh | bash -s -- ${origin} ${teamKey || "<team-key>"}`;

  return (
    <>
      <PageHeader
        title="Setup guide"
        description="Three steps to a fully reporting team"
      ></PageHeader>
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              A small collector on each member&apos;s machine reads their Claude Code login
              locally and reports <b>only usage percentages</b> here. Tokens never leave the
              machine.
            </CardDescription>
          </CardHeader>
        </Card>

        <Step n="1" title="Share the team install command">
          <p>
            One command for your whole team — drop it in your team chat. It carries this
            workspace&apos;s address and key, so it always points people to the right place.
          </p>
          <CopyBlock text={teamCmd} />
        </Step>

        <Step n="2" title="Everyone runs it once">
          <p>
            Each person pastes it into a terminal on the machine where they use Claude Code.
            It detects their Claude account automatically — they appear on the dashboard after
            their first report, no setup on your side.
          </p>
          <p className="text-xs">
            macOS shows a one-time Keychain prompt for &quot;Claude Code-credentials&quot; →
            click <b>Always Allow</b>. Reporting survives restarts.
          </p>
        </Step>

        <Step n="3" title="Choose cadence and reports" last>
          <p>
            In{" "}
            <Link href="/settings" className="text-primary font-medium underline underline-offset-4">
              Settings
            </Link>
            : how often machines report (15&nbsp;min – 2&nbsp;h), when the daily email goes out,
            inline or PDF format, and who receives it. Alerts fire automatically at your warn
            and critical thresholds.
          </p>
        </Step>

        <div className="border-border/70 mt-2 border-t pt-8">
          <h3 className="mb-1.5 text-sm font-medium">Deploying to a server?</h3>
          <p className="text-muted-foreground mb-3 text-sm">
            Set the email key, then let cron trigger the daily report (safe to call hourly —
            it sends once, at your configured time):
          </p>
          <CopyBlock
            text={`# .env
RESEND_API_KEY=re_xxx
EMAIL_FROM="Brim <usage@yourdomain.com>"
APP_URL=https://your-server

# crontab
0 * * * * curl -s "https://your-server/api/cron/daily?secret=$CRON_SECRET"`}
          />
        </div>
      </main>
    </>
  );
}
