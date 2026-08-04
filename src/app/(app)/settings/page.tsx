"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";

type AdminSettings = {
  collectIntervalMin: number;
  digestHourUtc: number;
  warnThreshold: number;
  criticalThreshold: number;
  adminEmail: string;
  digestEnabled: boolean;
  alertsEnabled: boolean;
  digestFormat: "inline" | "pdf";
  digestAudience: "all" | "admin";
};

const INTERVALS = [15, 30, 60, 120];

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

  const save = async () => {
    if (!settings) return;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
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
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Collection cadence, report schedule and format, and alert thresholds"
      >
        {status && <p className="text-muted-foreground text-sm">{status}</p>}
      </PageHeader>
      <main className="mx-auto w-full max-w-4xl px-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Collection</CardTitle>
          <CardDescription>How often each member&apos;s machine reports usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <Label>Collector interval</Label>
            <Select
              value={String(settings.collectIntervalMin)}
              onValueChange={(v) => setSettings({ ...settings, collectIntervalMin: Number(v) })}
            >
              <SelectTrigger className="w-full">
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
            <p className="text-muted-foreground text-xs">
              Applies to every machine automatically — no reinstall needed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Email reports &amp; alerts</CardTitle>
          <CardDescription>
            The daily digest goes to every member; the admin email is CC&apos;d on everything.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Daily report time (UTC)</Label>
              <Select
                value={String(settings.digestHourUtc)}
                onValueChange={(v) => setSettings({ ...settings, digestHourUtc: Number(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00 UTC
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Report format</Label>
              <Select
                value={settings.digestFormat}
                onValueChange={(v) =>
                  setSettings({ ...settings, digestFormat: v as "inline" | "pdf" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline table (read directly in the mail)</SelectItem>
                  <SelectItem value="pdf">PDF attachment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Send report to</Label>
              <Select
                value={settings.digestAudience}
                onValueChange={(v) =>
                  setSettings({ ...settings, digestAudience: v as "all" | "admin" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin only</SelectItem>
                  <SelectItem value="all">All members + admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Threshold and reset alerts still go to the affected member either way.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Admin email</Label>
              <Input
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                placeholder="admin@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Warn at (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={settings.warnThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, warnThreshold: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Critical at (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.criticalThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, criticalThreshold: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Switch
                checked={settings.digestEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, digestEnabled: v })}
              />
              <Label>Daily report email</Label>
            </div>

            <div className="flex items-center gap-2.5">
              <Switch
                checked={settings.alertsEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, alertsEnabled: v })}
              />
              <Label>Threshold &amp; reset alerts</Label>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex gap-3">
            <Button onClick={save}>Save settings</Button>
            <Button variant="outline" onClick={sendTest}>
              <Send />
              Send test report now
            </Button>
          </div>
        </CardContent>
      </Card>
      </main>
    </>
  );
}
