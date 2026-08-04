"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  Gauge,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { Separator } from "@/components/ui/separator";
import Meter, { fmtCountdown, fmtResetDate } from "@/components/Meter";

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
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "amber";
}) {
  const chip =
    tone === "amber"
      ? "bg-[color-mix(in_oklch,var(--color-amber-500)_12%,transparent)] text-[var(--color-amber-700)] dark:text-[var(--color-amber-400)]"
      : "bg-brand-50 text-brand-700 dark:bg-[color-mix(in_oklch,var(--color-brand-500)_15%,transparent)] dark:text-brand-300";
  return (
    <div className="bg-card flex items-start gap-3.5 rounded-xl border p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs font-medium">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</div>}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/team")
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setData(d);
          setUpdatedAt(new Date());
        })
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team usage</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Session (5-hour) and weekly limits across the team
          </p>
        </div>
        {updatedAt && (
          <p className="text-muted-foreground text-xs">
            Updated{" "}
            {updatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ·
            refreshes every minute
          </p>
        )}
      </div>

      {error && <p className="text-sm">Failed to load team data.</p>}

      {data && stats && data.members.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={<Users className="size-4" />}
            label="Members"
            value={String(data.members.length)}
            hint={`${stats.reporting.length} reporting`}
          />
          <StatTile
            icon={<Gauge className="size-4" />}
            label="Avg weekly used"
            value={`${stats.avgWeekly.toFixed(0)}%`}
            hint={`warn at ${data.thresholds.warn}%, critical at ${data.thresholds.critical}%`}
          />
          <StatTile
            icon={<TriangleAlert className="size-4" />}
            label="Near limits"
            value={String(stats.atRisk.length)}
            hint={
              stats.atRisk.length
                ? stats.atRisk.map((m) => m.name).join(", ")
                : "everyone in the clear"
            }
            tone={stats.atRisk.length ? "amber" : "brand"}
          />
          <StatTile
            icon={<CalendarClock className="size-4" />}
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
          action={
            <Link href="/admin" className="text-primary text-sm font-medium hover:underline">
              Open Admin →
            </Link>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.members.map((m) => (
          <Link
            key={m.id}
            href={`/member/${m.id}`}
            className="group bg-card hover:border-ring/40 rounded-xl border p-5 transition-colors hover:shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <MonogramAvatar name={m.name} colorful className="size-10 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{m.name}</span>
                  {m.stale && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-[10px]"
                      title="No recent report from this machine"
                    >
                      stale
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground truncate text-xs">{m.email}</div>
              </div>
              <ChevronRight className="text-muted-foreground/50 group-hover:text-muted-foreground size-4 transition-colors" />
            </div>

            {m.snapshot ? (
              <div className="space-y-4">
                <Meter
                  label="Session · 5 hour"
                  pct={m.snapshot.fiveHourPct}
                  resetsAt={m.snapshot.fiveHourResetsAt}
                  warn={data.thresholds.warn}
                  critical={data.thresholds.critical}
                />
                <Separator />
                <Meter
                  label="Weekly"
                  pct={m.snapshot.sevenDayPct}
                  resetsAt={m.snapshot.sevenDayResetsAt}
                  warn={data.thresholds.warn}
                  critical={data.thresholds.critical}
                />
                <div className="text-muted-foreground/80 pt-1 text-[11px]">
                  last report{" "}
                  {new Date(m.snapshot.capturedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                no data reported yet
              </p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
