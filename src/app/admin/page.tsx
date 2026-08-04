"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Send, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  ingestKey: string;
  active: boolean;
};

type AdminSettings = {
  collectIntervalMin: number;
  digestHourUtc: number;
  warnThreshold: number;
  criticalThreshold: number;
  adminEmail: string;
  digestEnabled: boolean;
  alertsEnabled: boolean;
  digestFormat: "inline" | "pdf";
};

const INTERVALS = [15, 30, 60, 120];

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [status, setStatus] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const api = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
          ...(init?.headers ?? {}),
        },
      }),
    [secret],
  );

  const loadAll = useCallback(async () => {
    const [uRes, sRes] = await Promise.all([
      api("/api/admin/users"),
      api("/api/admin/settings"),
    ]);
    if (!uRes.ok || !sRes.ok) {
      setAuthed(false);
      setStatus("Invalid admin secret");
      return false;
    }
    setUsers((await uRes.json()).users);
    setSettings((await sRes.json()).settings);
    setAuthed(true);
    setStatus("");
    return true;
  }, [api]);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminSecret");
    if (saved) setSecret(saved);
  }, []);

  useEffect(() => {
    if (secret && !authed && sessionStorage.getItem("adminSecret") === secret) loadAll();
  }, [secret, authed, loadAll]);

  const login = async () => {
    if (await loadAll()) sessionStorage.setItem("adminSecret", secret);
  };

  const addUser = async () => {
    const res = await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ name: newName, email: newEmail }),
    });
    if (res.ok) {
      setNewName("");
      setNewEmail("");
      loadAll();
    } else {
      setStatus((await res.json()).error ?? "failed to add");
    }
  };

  const patchUser = async (id: string, body: object) => {
    await api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    loadAll();
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} and all their usage history?`)) return;
    await api(`/api/admin/users/${id}`, { method: "DELETE" });
    loadAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    const res = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    setStatus(res.ok ? "Settings saved" : "Failed to save settings");
  };

  const sendTestDigest = async () => {
    setStatus("Sending test digest…");
    const res = await api("/api/cron/daily?force=1");
    const body = await res.json().catch(() => ({}));
    setStatus(
      res.ok
        ? body.sent
          ? `Digest sent to ${body.recipients} recipient(s)`
          : `Digest not sent: ${body.reason ?? "check RESEND_API_KEY"}`
        : "Digest request failed",
    );
  };

  const installCmd = (u: AdminUser) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `curl -sSL ${origin}/install.sh | bash -s -- ${origin} ${u.ingestKey}`;
  };

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-20">
        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>
              Enter the ADMIN_SECRET configured on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Admin secret"
            />
            <Button onClick={login} className="w-full">
              Sign in
            </Button>
            {status && <p className="text-destructive text-sm">{status}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        {status && <p className="text-muted-foreground text-sm">{status}</p>}
      </div>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Copy a member&apos;s install command and run it on their machine — the
            collector reports automatically from then on.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-wrap gap-2 px-6 pb-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="min-w-36 flex-1"
            />
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@company.com"
              className="min-w-52 flex-1"
            />
            <Button onClick={addUser}>
              <UserPlus />
              Add member
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-6">Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pe-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="ps-6">
                    <div className="flex items-center gap-3">
                      <MonogramAvatar name={u.name} colorful />
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-muted-foreground text-xs">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "secondary" : "outline"}>
                      {u.active ? "active" : "disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pe-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(installCmd(u))
                            .then(() => setStatus(`Install command for ${u.name} copied`))
                        }
                      >
                        <Copy />
                        Install cmd
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => patchUser(u.id, { active: !u.active })}>
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => patchUser(u.id, { regenerateKey: true })}>
                        <KeyRound />
                        New key
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteUser(u.id, u.name)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Collection cadence, report schedule and format, and alert thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                <Label>Admin email (CC on reports &amp; alerts)</Label>
                <Input
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Warn threshold (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={settings.warnThreshold}
                  onChange={(e) => setSettings({ ...settings, warnThreshold: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Critical threshold (%)</Label>
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

              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.digestEnabled}
                  onCheckedChange={(v) => setSettings({ ...settings, digestEnabled: v })}
                />
                <Label>Daily report email</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.alertsEnabled}
                  onCheckedChange={(v) => setSettings({ ...settings, alertsEnabled: v })}
                />
                <Label>Threshold &amp; reset alerts</Label>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex gap-3">
              <Button onClick={saveSettings}>Save settings</Button>
              <Button variant="outline" onClick={sendTestDigest}>
                <Send />
                Send test report now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
