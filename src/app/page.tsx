"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Gauge, CalendarClock, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import Meter, { fmtCountdown, fmtResetDate, statusOf } from "@/components/Meter";

type Member = {
  id: string;
  name: string;
  email: string;
  stale: boolean;
  snapshot: {
    fiveHourPct: number;
    fiveHourResetsAt: string;
    sevenDayPct: number;
    sevenDayResetsAt: string;
    capturedAt: string;
  } | null;
};

type TeamResponse = {
  thresholds: { warn: number; critical: number };
  members: Member[];
};

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-xl border p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const [data, setData] = useState<TeamResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/team")
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => alive && setError(true));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const reporting = data.members.filter((m) => m.snapshot);
    const avgWeekly = reporting.length
      ? reporting.reduce((s, m) => s + m.snapshot!.sevenDayPct, 0) / reporting.length
      : 0;
    const atRisk = reporting.filter(
      (m) =>
        m.snapshot!.sevenDayPct >= data.thresholds.warn ||
        m.snapshot!.fiveHourPct >= data.thresholds.warn,
    );
    const nextReset = reporting.length
      ? reporting.reduce((min, m) =>
          new Date(m.snapshot!.sevenDayResetsAt) < new Date(min.snapshot!.sevenDayResetsAt)
            ? m
            : min,
        )
      : null;
    return { reporting, avgWeekly, atRisk, nextReset };
  }, [data]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Team usage</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Session (5-hour) and weekly limit utilization across the team
        </p>
      </div>

      {error && <p className="text-sm">Failed to load team data.</p>}

      {data && stats && data.members.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={<Users className="size-3.5" />}
            label="Members"
            value={String(data.members.length)}
            hint={`${stats.reporting.length} reporting`}
          />
          <StatTile
            icon={<Gauge className="size-3.5" />}
            label="Avg weekly used"
            value={`${stats.avgWeekly.toFixed(0)}%`}
          />
          <StatTile
            icon={<TriangleAlert className="size-3.5" />}
            label="Near limits"
            value={String(stats.atRisk.length)}
            hint={
              stats.atRisk.length
                ? stats.atRisk.map((m) => m.name).join(", ")
                : "everyone in the clear"
            }
          />
          <StatTile
            icon={<CalendarClock className="size-3.5" />}
            label="Next weekly reset"
            value={
              stats.nextReset ? fmtCountdown(stats.nextReset.snapshot!.sevenDayResetsAt) : "—"
            }
            hint={
              stats.nextReset
                ? `${stats.nextReset.name} · ${fmtResetDate(stats.nextReset.snapshot!.sevenDayResetsAt)}`
                : undefined
            }
          />
        </div>
      )}

      {data && data.members.length === 0 && (
        <EmptyState
          title="No members yet"
          description="Add your team in Admin — each member gets a one-line install command for their machine."
        />
      )}

      {data && data.members.length > 0 && (
        <div className="bg-card overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">Member</TableHead>
                <TableHead className="min-w-44">Session (5h)</TableHead>
                <TableHead className="min-w-44">Weekly</TableHead>
                <TableHead>Session resets</TableHead>
                <TableHead>Weekly resets</TableHead>
                <TableHead className="pe-4 text-right">Last report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((m) => {
                const s = m.snapshot;
                return (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/member/${m.id}`)}
                  >
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <MonogramAvatar name={m.name} colorful />
                        <div className="min-w-0">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-muted-foreground truncate text-xs">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    {s ? (
                      <>
                        <TableCell>
                          <Meter
                            pct={s.fiveHourPct}
                            resetsAt={s.fiveHourResetsAt}
                            warn={data.thresholds.warn}
                            critical={data.thresholds.critical}
                            compact
                          />
                        </TableCell>
                        <TableCell>
                          <Meter
                            pct={s.sevenDayPct}
                            resetsAt={s.sevenDayResetsAt}
                            warn={data.thresholds.warn}
                            critical={data.thresholds.critical}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          in {fmtCountdown(s.fiveHourResetsAt)}
                          <div>{fmtResetDate(s.fiveHourResetsAt)}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          in {fmtCountdown(s.sevenDayResetsAt)}
                          <div>{fmtResetDate(s.sevenDayResetsAt)}</div>
                        </TableCell>
                        <TableCell className="pe-4 text-right">
                          <span className="text-muted-foreground text-xs">
                            {new Date(s.capturedAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {m.stale && (
                            <Badge variant="outline" className="ms-2 text-[10px]">
                              stale
                            </Badge>
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={5} className="text-muted-foreground pe-4 text-sm">
                        no data reported yet
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
