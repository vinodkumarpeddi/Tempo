"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, MoreHorizontal, Power, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import PageHeader from "@/components/PageHeader";
import CopyBlock from "@/components/CopyBlock";
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

export default function MembersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teamKey, setTeamKey] = useState("");
  const [status, setStatus] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const load = useCallback(async () => {
    const [res, sRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/settings"),
    ]);
    if (res.status === 401) return router.push("/login");
    if (res.ok) setUsers((await res.json()).users);
    if (sRes.ok) setTeamKey((await sRes.json()).settings.teamKey ?? "");
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const addUser = async () => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail }),
    });
    if (res.ok) {
      setNewName("");
      setNewEmail("");
      setStatus("");
      load();
    } else {
      setStatus((await res.json()).error ?? "failed to add");
    }
  };

  const patchUser = async (id: string, body: object) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} and all their usage history?`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  };

  const installCmd = (u: AdminUser) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `curl -sSL ${origin}/install.sh | bash -s -- ${origin} ${u.ingestKey}`;
  };

  return (
    <>
      <PageHeader title="Members" description="Everyone whose Claude usage is tracked in this workspace">{status && <p className="text-muted-foreground text-sm">{status}</p>}</PageHeader>
      <main className="w-full px-8 py-6">

      {teamKey && (
        <div className="bg-card mb-6 rounded-lg border p-5">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Team install command</h2>
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
              one command for everyone
            </span>
          </div>
          <p className="text-muted-foreground mb-3 text-sm">
            Share this once — it detects each person&apos;s Claude account automatically, and
            they appear here after their first report.
          </p>
          <CopyBlock
            text={`curl -sSL ${typeof window !== "undefined" ? window.location.origin : ""}/install.sh | bash -s -- ${typeof window !== "undefined" ? window.location.origin : ""} ${teamKey}`}
          />
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <div className="border-border/70 flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="h-9 w-44"
          />
          <Input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@company.com"
            className="h-9 w-64"
          />
          <Button size="sm" onClick={addUser}>
            <UserPlus />
            Add member
          </Button>
          <span className="text-muted-foreground ms-auto text-xs">
            {users.length} member{users.length === 1 ? "" : "s"}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="[&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-wider [&_th]:uppercase">
              <TableHead className="ps-4">Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pe-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="ps-4">
                  <div className="flex items-center gap-3">
                    <MonogramAvatar name={u.name} />
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="border-border bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium">
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        background: u.active
                          ? "var(--color-emerald-500)"
                          : "var(--muted-foreground)",
                      }}
                    />
                    {u.active ? "active" : "disabled"}
                  </span>
                </TableCell>
                <TableCell className="pe-4">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-8 p-0">
                          <MoreHorizontal />
                          <span className="sr-only">Actions for {u.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard
                              .writeText(installCmd(u))
                              .then(() => setStatus(`Install command for ${u.name} copied`))
                          }
                        >
                          <Copy />
                          Copy install command
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => patchUser(u.id, { active: !u.active })}>
                          <Power />
                          {u.active ? "Disable tracking" : "Enable tracking"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => patchUser(u.id, { regenerateKey: true })}>
                          <KeyRound />
                          Regenerate key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteUser(u.id, u.name)}
                        >
                          <Trash2 />
                          Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-10 text-center text-sm">
                  No members yet — add the first one above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </main>
    </>
  );
}
