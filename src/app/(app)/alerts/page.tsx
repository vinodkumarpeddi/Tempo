"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Alert = {
  id: string;
  kind: string;
  member: string;
  email: string;
  windowKey: string;
  sentAt: string;
};

const KIND_LABEL: Record<string, { label: string; tone: "amber" | "rose" | "emerald" }> = {
  "session-warn": { label: "Session high", tone: "amber" },
  "session-critical": { label: "Session critical", tone: "rose" },
  "session-reset": { label: "Session reset", tone: "emerald" },
  "weekly-warn": { label: "Weekly high", tone: "amber" },
  "weekly-critical": { label: "Weekly critical", tone: "rose" },
  "weekly-reset": { label: "Weekly reset", tone: "emerald" },
};

const TONE = {
  amber:
    "bg-[color-mix(in_oklch,var(--color-amber-500)_14%,transparent)] text-[var(--color-amber-700)] dark:text-[var(--color-amber-400)]",
  rose: "bg-[color-mix(in_oklch,var(--color-rose-500)_12%,transparent)] text-[var(--color-rose-700)] dark:text-[var(--color-rose-400)]",
  emerald:
    "bg-[color-mix(in_oklch,var(--color-emerald-500)_12%,transparent)] text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]",
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/alerts").then(async (res) => {
      if (res.status === 401) return router.push("/login");
      if (res.ok) setAlerts((await res.json()).alerts);
    });
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every threshold warning and reset notice that has been sent
        </p>
      </div>

      {alerts && alerts.length === 0 && (
        <EmptyState
          title="No alerts yet"
          description="Threshold warnings and reset notices will appear here as they are sent."
        />
      )}

      {alerts && alerts.length > 0 && (
        <Card className="overflow-hidden py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">Alert</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="pe-6 text-right">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => {
                  const meta = KIND_LABEL[a.kind] ?? { label: a.kind, tone: "amber" as const };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="ps-6">
                        <Badge className={`border-transparent ${TONE[meta.tone]}`}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <MonogramAvatar name={a.member} colorful className="size-7 text-[10px]" />
                          <div>
                            <span className="text-sm font-medium">{a.member}</span>{" "}
                            <span className="text-muted-foreground text-xs">{a.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground pe-6 text-right text-xs whitespace-nowrap">
                        {new Date(a.sentAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
