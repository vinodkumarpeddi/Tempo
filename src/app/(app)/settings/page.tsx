"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, FileText, Plus, Send, Table2, X } from "lucide-react";
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
import { cn } from "@/lib/cn";

type AdminSettings = {
  collectIntervalMin: number;
  digestTimes: string;
  digestDays: string;
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
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

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
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(async (res) => {
      if (res.status === 401) return router.push("/login");
      if (res.ok) setSettings((await res.json()).settings);
    });
  }, [router]);

  const times = (settings?.digestTimes ?? "")
    .split(",")
    .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  const setTimes = (next: string[]) =>
    settings &&
    setSettings({ ...settings, digestTimes: [...new Set(next)].sort().join(",") });

  const [newHour, setNewHour] = useState("");
  const [newMinute, setNewMinute] = useState("");
  const newTime = newHour && newMinute ? `${newHour}:${newMinute}` : null;
  const addTime = () => {
    if (!newTime || times.includes(newTime)) return;
    setTimes([...times, newTime]);
    setNewHour("");
    setNewMinute("");
  };

  const days = (settings?.digestDays ?? "")
    .split(",")
    .map((d) => parseInt(d, 10))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const toggleDay = (d: number) => {
    if (!settings) return;
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    if (next.length === 0) return;
    setSettings({ ...settings, digestDays: next.sort((a, b) => a - b).join(",") });
  };

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, digestTimes: times, digestDays: days }),
    });
    setSaving(false);
    if (res.ok) {
      const saved = (await res.json()).settings as AdminSettings;
      if (Number.isInteger(settings.collectIntervalMin) && saved.collectIntervalMin !== settings.collectIntervalMin) {
        toast.info(`Interval adjusted to ${saved.collectIntervalMin} min`, {
          description: "Collectors tick every 10 minutes, so 10 is the fastest possible.",
        });
      } else {
        toast.success("Settings saved", { description: "Changes are live for every collector." });
      }
      setSettings(saved);
    } else {
      toast.error("Couldn't save settings", { description: "Check the values and try again." });
    }
  };

  const sendTest = async () => {
    if (testing) return;
    setTesting(true);
    const res = await fetch("/api/cron/daily?force=1");
    const body = await res.json().catch(() => ({}));
    setTesting(false);
    if (res.ok && body.sent)
      toast.success(`Test report sent to ${body.recipients} recipient(s)`, {
        description: "Check the inbox in a few seconds.",
      });
    else
      toast.error("Report not sent", {
        description: body.reason ?? "Check the email configuration.",
      });
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
      ></PageHeader>
      <main className="w-full px-8 pt-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card
            title="Collection"
            description="How often each member's machine reports usage. Applies everywhere automatically."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                options={[...INTERVALS, { value: -1, label: "Custom" }]}
                value={
                  INTERVALS.some((i) => i.value === settings.collectIntervalMin)
                    ? settings.collectIntervalMin
                    : -1
                }
                onChange={(v) =>
                  setSettings({ ...settings, collectIntervalMin: v === -1 ? 45 : v })
                }
              />
              {!INTERVALS.some((i) => i.value === settings.collectIntervalMin) && (
                <div className="relative">
                  <Input
                    type="number"
                    min={10}
                    max={720}
                    step={5}
                    value={settings.collectIntervalMin}
                    onChange={(e) =>
                      setSettings({ ...settings, collectIntervalMin: Number(e.target.value) })
                    }
                    onBlur={(e) => {
                      const v = Math.min(720, Math.max(10, Number(e.target.value) || 10));
                      setSettings({ ...settings, collectIntervalMin: v });
                    }}
                    className="w-28 pe-10"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    min
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground -mt-3 text-xs">
              Any value from 10 to 720 minutes — collectors tick every 10 minutes, so timing
              rounds to the next tick.
            </p>
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
            <Field label="Send at — exact times, as many as you need (IST)">
              <div className="flex flex-wrap items-center gap-1.5">
                {times.map((t) => (
                  <span
                    key={t}
                    className="border-border bg-secondary/60 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium tabular-nums"
                  >
                    {t}
                    <button
                      onClick={() => times.length > 1 && setTimes(times.filter((x) => x !== t))}
                      disabled={times.length === 1}
                      aria-label={`Remove ${t}`}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {times.length < 12 && (
                  <div className="ms-1 flex items-center gap-1.5">
                    <Select value={newHour} onValueChange={setNewHour}>
                      <SelectTrigger size="sm" aria-label="Hour" className="w-[74px] tabular-nums">
                        <SelectValue placeholder="hh" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={h} className="tabular-nums">
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground text-sm font-medium">:</span>
                    <Select value={newMinute} onValueChange={setNewMinute}>
                      <SelectTrigger size="sm" aria-label="Minute" className="w-[74px] tabular-nums">
                        <SelectValue placeholder="mm" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {MINUTES.map((m) => (
                          <SelectItem key={m} value={m} className="tabular-nums">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addTime}
                      disabled={!newTime || times.includes(newTime)}
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </Field>

            <Field label="On days">
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "size-9 rounded-lg border text-[12px] font-medium transition-colors",
                      days.includes(i)
                        ? "border-foreground/70 bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d[0]}
                  </button>
                ))}
                <span className="text-muted-foreground ms-2 text-xs">
                  {days.length === 7
                    ? "Every day"
                    : days.map((d) => DAY_LABELS[d]).join(", ")}
                </span>
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
            <Button variant="outline" size="sm" onClick={sendTest} disabled={testing}>
              <Send className={testing ? "animate-pulse" : undefined} />
              {testing ? "Sending…" : "Send test report"}
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
