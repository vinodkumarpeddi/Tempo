"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Plus, Send, Table2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/cn";

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

const INTERVALS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

function Card({
  title,
  description,
  action,
  children,
  dimmed = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-[13px]">{description}</p>
        </div>
        {action}
      </div>
      <div
        className={cn(
          "space-y-6 px-6 pb-6 transition-opacity",
          dimmed && "pointer-events-none opacity-40",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="bg-secondary/60 inline-flex rounded-lg p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            o.value === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
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

  const warn = settings.warnThreshold;
  const critical = settings.criticalThreshold;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Collection cadence, reports, and alert thresholds"
      >
        {status && <p className="text-muted-foreground text-sm">{status}</p>}
      </PageHeader>
      <main className="w-full px-8 pt-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card
            title="Collection"
            description="How often each member's machine reports usage. Applies everywhere automatically."
          >
            <Segmented
              options={INTERVALS}
              value={settings.collectIntervalMin}
              onChange={(v) => setSettings({ ...settings, collectIntervalMin: v })}
            />
          </Card>

          <Card
            title="Usage reports"
            description="A snapshot of everyone's limits, emailed on your schedule."
            action={
              <Switch
                checked={settings.digestEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, digestEnabled: v })}
              />
            }
            dimmed={!settings.digestEnabled}
          >
            <Field label="Send at — as many times a day as you need (UTC)">
              <div className="flex flex-wrap items-center gap-1.5">
                {hours.map((h) => (
                  <span
                    key={h}
                    className="border-border bg-secondary/60 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums"
                  >
                    {String(h).padStart(2, "0")}:00
                    <button
                      onClick={() => hours.length > 1 && setHours(hours.filter((x) => x !== h))}
                      disabled={hours.length === 1}
                      aria-label={`Remove ${h}:00`}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {hours.length < 6 && (
                  <Select value="" onValueChange={(v) => setHours([...hours, Number(v)])}>
                    <SelectTrigger className="border-border text-muted-foreground hover:text-foreground h-[34px] w-auto gap-1 border-dashed px-2.5 text-[13px]">
                      <Plus className="size-3.5" />
                      Add time
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
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Format">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "inline", label: "Inline table", icon: Table2 },
                      { value: "pdf", label: "PDF attached", icon: FileText },
                    ] as const
                  ).map((o) => {
                    const active = settings.digestFormat === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setSettings({ ...settings, digestFormat: o.value })}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors",
                          active
                            ? "border-foreground/70 ring-foreground/70 ring-1"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <o.icon className="size-4" />
                        {o.label}
                        {active && <Check className="ms-auto size-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Recipients">
                <Segmented
                  options={[
                    { value: "admin", label: "Admin only" },
                    { value: "all", label: "Everyone" },
                  ]}
                  value={settings.digestAudience}
                  onChange={(v) => setSettings({ ...settings, digestAudience: v })}
                />
                <p className="text-muted-foreground mt-2 text-xs">
                  Alerts always reach the affected member.
                </p>
              </Field>
            </div>

            <Field label="Admin email — CC'd on reports and every alert">
              <Input
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                placeholder="admin@company.com"
                className="max-w-xs"
              />
            </Field>
          </Card>

          <Card
            title="Alerts"
            description="Email members before they hit a wall, and when limits reset."
            action={
              <Switch
                checked={settings.alertsEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, alertsEnabled: v })}
              />
            }
            dimmed={!settings.alertsEnabled}
          >
            <Field label="Thresholds">
              <div className="bg-secondary flex h-2.5 overflow-hidden rounded-full">
                <div
                  className="h-full bg-[var(--color-emerald-500)]"
                  style={{ width: `${Math.min(warn, critical)}%` }}
                />
                <div
                  className="h-full bg-[var(--color-amber-500)]"
                  style={{ width: `${Math.max(0, critical - warn)}%` }}
                />
                <div
                  className="h-full bg-[var(--color-rose-500)]"
                  style={{ width: `${Math.max(0, 100 - Math.max(warn, critical))}%` }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                    <span className="size-2 rounded-full bg-[var(--color-amber-500)]" />
                    Warn at
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={warn}
                      onChange={(e) =>
                        setSettings({ ...settings, warnThreshold: Number(e.target.value) })
                      }
                      className="w-24 pe-7"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                    <span className="size-2 rounded-full bg-[var(--color-rose-500)]" />
                    Critical at
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={critical}
                      onChange={(e) =>
                        setSettings({ ...settings, criticalThreshold: Number(e.target.value) })
                      }
                      className="w-24 pe-7"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </Field>
          </Card>
        </div>

        <div className="border-border/70 bg-background/95 sticky bottom-0 z-10 -mx-8 mt-8 border-t px-8 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
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
          </div>
        </div>
      </main>
    </>
  );
}
