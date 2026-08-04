"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CopyBlock from "@/components/CopyBlock";
import PageHeader from "@/components/PageHeader";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {n}
        </span>
        <span className="bg-border mt-2 w-px flex-1" />
      </div>
      <div className="min-w-0 flex-1 pb-8">
        <h3 className="mb-2 pt-0.5 font-medium">{title}</h3>
        <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <>
      <PageHeader title="Setup guide" description="From zero to a fully reporting team in about ten minutes"></PageHeader>
      <main className="mx-auto w-full max-w-3xl px-6 py-6">

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            Each member&apos;s machine runs a tiny collector on a schedule. It reads the OAuth
            token Claude Code already stores locally, asks Anthropic for the current session
            (5-hour) and weekly utilization, and reports <b>only the percentages</b> here. The
            token never leaves the machine.
          </CardDescription>
        </CardHeader>
      </Card>

      <Step n={1} title="Add your members">
        <p>
          Go to <Link href="/members" className="text-primary font-medium hover:underline">Members</Link>{" "}
          and add each person&apos;s name and email. Every member gets a unique ingest key baked
          into their personal install command.
        </p>
      </Step>

      <Step n={2} title="Install the collector on each machine">
        <p>
          Copy the member&apos;s install command from the Members page and have them run it in a
          terminal. It looks like this:
        </p>
        <CopyBlock text={`curl -sSL https://your-server/install.sh | bash -s -- https://your-server ctu_xxx`} />
        <p>
          The installer registers a background job — <Badge variant="secondary">launchd</Badge> on
          macOS, <Badge variant="secondary">cron</Badge> on Linux — that ticks every 10 minutes and
          reports on the interval you configure. On macOS the first run may show a Keychain prompt
          for <i>&quot;Claude Code-credentials&quot;</i> — click <b>Always Allow</b>.
        </p>
        <p>
          The member must have Claude Code installed and signed in on that machine — the collector
          reuses its stored login; nobody types a password or token anywhere.
        </p>
      </Step>

      <Step n={3} title="Pick the reporting interval">
        <p>
          In <Link href="/settings" className="text-primary font-medium hover:underline">Settings</Link>,
          choose how often collectors report: 15 minutes to 2 hours. Collectors check in with the
          server each tick, so a change here reaches every machine automatically.
        </p>
      </Step>

      <Step n={4} title="Turn on email reports">
        <p>
          Set these environment variables on the server, then restart it (emails are skipped and
          logged while <code className="text-foreground">RESEND_API_KEY</code> is empty):
        </p>
        <CopyBlock
          text={`RESEND_API_KEY=re_xxx           # from resend.com
EMAIL_FROM="Claude Usage <usage@yourdomain.com>"
APP_URL=https://your-server`}
        />
        <p>
          Then schedule the daily report — the endpoint is safe to call hourly and only sends at
          the hour you configured, once per day. On a VPS:
        </p>
        <CopyBlock text={`0 * * * * curl -s "https://your-server/api/cron/daily?secret=$CRON_SECRET"`} />
        <p>
          Pick the send time and format (inline table or PDF attachment) in Settings, and use{" "}
          <b>Send test report now</b> to verify delivery.
        </p>
      </Step>

      <Step n={5} title="Understand the alerts">
        <p>
          Alerts are evaluated every time a report arrives — no extra scheduling needed:
        </p>
        <ul className="list-disc space-y-1 ps-5">
          <li>
            <b className="text-foreground">Threshold warnings</b> — a member crossing the warn or
            critical threshold (defaults 80% / 95%) gets an email, with the admin CC&apos;d.
          </li>
          <li>
            <b className="text-foreground">Reset notices</b> — when a weekly window rolls over,
            the member is told they&apos;re back to 0%. Session resets only notify if the member
            was near the limit.
          </li>
          <li>
            <b className="text-foreground">Stale badge</b> — if a machine stops reporting (laptop
            off, collector removed), its dashboard card shows <i>stale</i> instead of silently
            showing old numbers.
          </li>
        </ul>
      </Step>

      <div className="relative flex gap-4">
        <span className="bg-[var(--color-emerald-500)] flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
          ✓
        </span>
        <div className="pt-0.5">
          <h3 className="font-medium">Done</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Watch the{" "}
            <Link href="/dashboard" className="text-primary font-medium hover:underline">
              Dashboard
            </Link>{" "}
            fill in as collectors report — meters, reset dates, and history for every member.
          </p>
        </div>
      </div>
      </main>
    </>
  );
}
