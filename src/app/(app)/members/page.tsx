"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 401) return router.push("/login");
    if (res.ok) setUsers((await res.json()).users);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const addUser = async () => {
    if (adding) return;
    setAdding(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail }),
    });
    setAdding(false);
    if (res.ok) {
      toast.success(`${newName} added`, {
        description: "They'll appear on the dashboard after their first report.",
      });
      setNewName("");
      setNewEmail("");
      load();
    } else {
      toast.error("Couldn't add member", {
        description: (await res.json()).error ?? "Check the name and email.",
      });
    }
  };

  const patchUser = async (id: string, body: object, message?: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok && message) toast.success(message);
    if (!res.ok) toast.error("Action failed");
    load();
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} and all their usage history?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok)
      toast.success(`${name} removed`, {
        description: "Their machine can no longer report until re-added.",
      });
    else toast.error("Couldn't remove member");
    load();
  };

  const installCmd = (u: AdminUser) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `curl -sSL ${origin}/install.sh | bash -s -- ${origin} ${u.ingestKey}`;
  };

  return (
    <>
      <PageHeader title="Members" description="Everyone whose Claude usage is tracked in this workspace"></PageHeader>
      <main className="w-full px-8 py-6">

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
          <Button size="sm" onClick={addUser} disabled={adding}>
            <UserPlus />
            {adding ? "Adding…" : "Add member"}
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
                              .then(() => toast.success(`Install command for ${u.name} copied`))
                          }
                        >
                          <Copy />
                          Copy install command
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => patchUser(u.id, { active: !u.active }, u.active ? `${u.name} disabled` : `${u.name} enabled`)}>
                          <Power />
                          {u.active ? "Disable tracking" : "Enable tracking"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => patchUser(u.id, { regenerateKey: true }, `New key for ${u.name} — share their new install command`)}>
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
