"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";

type AdminSettings = {
  collectIntervalMin: number;
  digestHours: string;
  warnThreshold: number;
  criticalThreshold: number;
  adminEmail: string;
  digestEnabled: boolean;
  alertsEnabled: boolean;
  digestFormat: "inline" | "pdf";
  digestAudience: "all" | "admin";
};

const INTERVALS = [15, 30, 60, 120];

function Section({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-xl border">
      <div className="border-border/70 border-b px-6 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
      </div>
      <div>{children}</div>
      {footer && (
        <div className="border-border/70 bg-muted/40 flex items-center justify-end gap-2 border-t px-6 py-3">
          {footer}
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/70 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b px-6 py-4 last:border-b-0">
      <div className="min-w-0 max-w-md">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(async (res) => {
      if (res.status === 401) return router.push("/login");
      if (res.ok) setSettings((await res.json()).settings);
    });
  }, [router]);

  const hours = (settings?.digestHours ?? "")
    .split(",")
    .map((h) => parseInt(h, 10))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);

  const setHours = (next: number[]) =>
    settings &&
    setSettings({ ...settings, digestHours: [...new Set(next)].sort((a, b) => a - b).join(",") });
  const addHour = (h: number) => setHours([...hours, h]);
  const removeHour = (h: number) => hours.length > 1 && setHours(hours.filter((x) => x !== h));

  const save = async () => {
    if (!settings) return;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, digestHours: hours }),
    });
    setStatus(res.ok ? "Settings saved" : "Failed to save settings");
  };

  const sendTest = async () => {
    setStatus("Sending test report…");
    const res = await fetch("/api/cron/daily?force=1");
    const body = await res.json().catch(() => ({}));
    setStatus(
      res.ok
        ? body.sent
          ? `Report sent to ${body.recipients} recipient(s)`
          : `Not sent: ${body.reason ?? "check RESEND_API_KEY"}`
        : "Request failed",
    );
  };

  if (!settings) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Collection cadence, the daily report, and alert thresholds"
      >
        {status && <p className="text-muted-foreground text-sm">{status}</p>}
      </PageHeader>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <Section
          title="Collection"
          description="How often each member's machine reports usage."
        >
          <Row
            label="Collector interval"
            desc="Applies to every machine automatically — no reinstall needed."
          >
            <Select
              value={String(settings.collectIntervalMin)}
              onValueChange={(v) => setSettings({ ...settings, collectIntervalMin: Number(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i >= 60 ? `${i / 60} hour${i > 60 ? "s" : ""}` : `${i} minutes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section
          title="Daily report"
          description="A snapshot of everyone's usage, delivered by email."
        >
          <Row label="Enabled">
            <Switch
              checked={settings.digestEnabled}
              onCheckedChange={(v) => setSettings({ ...settings, digestEnabled: v })}
            />
          </Row>
          <Row
            label="Send at"
            desc="As many times per day as you need — one report goes out at each hour (UTC)."
          >
            <div className="flex max-w-xs flex-wrap items-center justify-end gap-1.5">
              {hours.map((h) => (
                <span
                  key={h}
                  className="border-border bg-secondary/60 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium tabular-nums"
                >
                  {String(h).padStart(2, "0")}:00
                  <button
                    onClick={() => removeHour(h)}
                    disabled={hours.length === 1}
                    aria-label={`Remove ${h}:00`}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {hours.length < 6 && (
                <Select value="" onValueChange={(v) => addHour(Number(v))}>
                  <SelectTrigger className="h-7 w-[4.6rem] px-2 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Plus className="size-3" />
                      Add
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, h) => h)
                      .filter((h) => !hours.includes(h))
                      .map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {String(h).padStart(2, "0")}:00 UTC
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Row>
          <Row label="Format">
            <Select
              value={settings.digestFormat}
              onValueChange={(v) =>
                setSettings({ ...settings, digestFormat: v as "inline" | "pdf" })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inline">Inline table</SelectItem>
                <SelectItem value="pdf">PDF attachment</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row
            label="Recipients"
            desc="Threshold and reset alerts still go to the affected member either way."
          >
            <Select
              value={settings.digestAudience}
              onValueChange={(v) =>
                setSettings({ ...settings, digestAudience: v as "all" | "admin" })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin only</SelectItem>
                <SelectItem value="all">All members + admin</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Admin email" desc="CC'd on reports and every alert.">
            <Input
              value={settings.adminEmail}
              onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
              placeholder="admin@company.com"
              className="w-64"
            />
          </Row>
        </Section>

        <Section
          title="Alerts"
          description="Email members before they hit a wall, and when limits reset."
          footer={
            <>
              <p className="text-muted-foreground me-auto text-xs">
                Changes apply immediately after saving.
              </p>
              <Button variant="outline" size="sm" onClick={sendTest}>
                <Send />
                Send test report
              </Button>
              <Button size="sm" onClick={save}>
                Save settings
              </Button>
            </>
          }
        >
          <Row label="Enabled">
            <Switch
              checked={settings.alertsEnabled}
              onCheckedChange={(v) => setSettings({ ...settings, alertsEnabled: v })}
            />
          </Row>
          <Row label="Warn at" desc="First heads-up when a window crosses this.">
            <div className="relative">
              <Input
                type="number"
                min={1}
                max={99}
                value={settings.warnThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, warnThreshold: Number(e.target.value) })
                }
                className="w-24 pe-7"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
          </Row>
          <Row label="Critical at" desc="Urgent alert — the limit is imminent.">
            <div className="relative">
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.criticalThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, criticalThreshold: Number(e.target.value) })
                }
                className="w-24 pe-7"
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
          </Row>
        </Section>
      </main>
    </>
  );
}
