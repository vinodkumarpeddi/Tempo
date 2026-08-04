"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [status, setStatus] = useState("");
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
      <main className="mx-auto w-full max-w-5xl px-6 py-6">

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            Copy a member&apos;s install command and run it on their machine — the collector
            reports automatically from then on. See the Setup guide for details.
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patchUser(u.id, { active: !u.active })}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patchUser(u.id, { regenerateKey: true })}
                      >
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
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-10 text-center text-sm">
                    No members yet — add the first one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </main>
    </>
  );
}
