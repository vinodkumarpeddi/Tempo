"use client";

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

        <Step n="1" title="Add a member">
          <p>
            On the{" "}
            <Link href="/members" className="text-primary font-medium underline underline-offset-4">
              Members
            </Link>{" "}
            page, add their name and email.
          </p>
        </Step>

        <Step n="2" title="Send them their install command">
          <p>
            Open the <b>⋯ menu</b> on their row and choose <b>Copy install command</b>. They
            paste it into a terminal on the machine where they use Claude Code — that&apos;s all
            they ever do.
          </p>
          <p className="text-xs">
            macOS shows a one-time Keychain prompt for &quot;Claude Code-credentials&quot; →
            click <b>Always Allow</b>. Reporting starts immediately and survives restarts.
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
