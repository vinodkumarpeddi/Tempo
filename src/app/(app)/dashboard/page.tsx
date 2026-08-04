"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  CalendarClock,
  ChevronRight,
  TriangleAlert,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { Separator } from "@/components/ui/separator";
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

const HEADROOM_CHIP = {
  good: "bg-[color-mix(in_oklch,var(--color-emerald-500)_12%,transparent)] text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]",
  warning:
    "bg-[color-mix(in_oklch,var(--color-amber-500)_14%,transparent)] text-[var(--color-amber-700)] dark:text-[var(--color-amber-400)]",
  critical:
    "bg-[color-mix(in_oklch,var(--color-rose-500)_12%,transparent)] text-[var(--color-rose-700)] dark:text-[var(--color-rose-400)]",
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
  tone?: "brand" | "amber" | "emerald";
}) {
  const chip =
    tone === "amber"
      ? "bg-[color-mix(in_oklch,var(--color-amber-500)_12%,transparent)] text-[var(--color-amber-700)] dark:text-[var(--color-amber-400)]"
      : tone === "emerald"
        ? "bg-[color-mix(in_oklch,var(--color-emerald-500)_12%,transparent)] text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]"
        : "bg-brand-50 text-brand-700 dark:bg-[color-mix(in_oklch,var(--color-brand-500)_15%,transparent)] dark:text-brand-300";
  return (
    <div className="bg-card flex items-start gap-3.5 rounded-xl border p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs font-medium">{label}</div>
        <div className="mt-0.5 truncate text-2xl font-semibold tracking-tight">{value}</div>
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
          if (!alive || !d.members) return;
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
    // Most available capacity first — that's who the team can route work to.
    const reporting = data.members
      .filter((m) => m.snapshot)
      .sort((a, b) => a.snapshot!.sevenDayPct - b.snapshot!.sevenDayPct);
    const notReporting = data.members.filter((m) => !m.snapshot);
    const mostAvailable = reporting[0] ?? null;
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
    return { reporting, notReporting, mostAvailable, atRisk, nextReset };
  }, [data]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team capacity</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Who has Claude allowance left — sorted by the most available first
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
            icon={<BatteryCharging className="size-4" />}
            label="Most available"
            value={stats.mostAvailable ? stats.mostAvailable.name : "—"}
            hint={
              stats.mostAvailable
                ? `${(100 - stats.mostAvailable.snapshot!.sevenDayPct).toFixed(0)}% of weekly limit left`
                : "no reports yet"
            }
            tone="emerald"
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
          description="Add your team in Members — each member gets a one-line install command for their machine."
          action={
            <Link href="/members" className="text-primary text-sm font-medium hover:underline">
              Open Members →
            </Link>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats?.reporting.map((m) => {
          const s = m.snapshot!;
          const weeklyLeft = Math.max(0, 100 - s.sevenDayPct);
          const chipTone = HEADROOM_CHIP[statusOf(s.sevenDayPct, data!.thresholds.warn, data!.thresholds.critical)];
          return (
            <Link
              key={m.id}
              href={`/member/${m.id}`}
              className="group bg-card hover:border-ring/40 rounded-xl border p-5 transition-colors hover:shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <MonogramAvatar name={m.name} colorful className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{m.email}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${chipTone}`}
                  title={m.stale ? "Last report is old — numbers may have moved" : undefined}
                >
                  {weeklyLeft.toFixed(0)}% left{m.stale ? " ?" : ""}
                </span>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-muted-foreground size-4 shrink-0 transition-colors" />
              </div>

              <div className="space-y-4">
                <Meter
                  label="Session · 5 hour"
                  pct={s.fiveHourPct}
                  resetsAt={s.fiveHourResetsAt}
                  warn={data!.thresholds.warn}
                  critical={data!.thresholds.critical}
                />
                <Separator />
                <Meter
                  label="Weekly"
                  pct={s.sevenDayPct}
                  resetsAt={s.sevenDayResetsAt}
                  warn={data!.thresholds.warn}
                  critical={data!.thresholds.critical}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {stats && stats.notReporting.length > 0 && (
        <div className="text-muted-foreground mt-6 rounded-xl border border-dashed px-5 py-4 text-sm">
          <span className="text-foreground font-medium">Not reporting yet:</span>{" "}
          {stats.notReporting.map((m) => m.name).join(", ")} — install the collector from{" "}
          <Link href="/members" className="text-primary font-medium hover:underline">
            Members
          </Link>
          .
        </div>
      )}
    </main>
  );
}
