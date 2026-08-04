"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  BatteryCharging,
  CalendarClock,
  ChevronRight,
  LayoutGrid,
  Search,
  Table2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Meter, { fmtCountdown, fmtResetDate, statusOf } from "@/components/Meter";
import Sparkline from "@/components/Sparkline";
import TeamTrendChart from "@/components/TeamTrendChart";

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
  spark: number[];
  sparkAt: string[];
};

type TeamResponse = {
  thresholds: { warn: number; critical: number };
  members: Member[];
};

type ViewMode = "table" | "cards";
type StatusFilter = "all" | "available" | "near" | "stale" | "none";
type SortKey = "headroom" | "name" | "session" | "weekly" | "lastReport";

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
  const router = useRouter();
  const [data, setData] = useState<TeamResponse | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("headroom");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("dashView");
    if (saved === "cards" || saved === "table") setView(saved);
  }, []);

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

  const setViewPersist = (v: ViewMode) => {
    setView(v);
    localStorage.setItem("dashView", v);
  };

  const stats = useMemo(() => {
    if (!data) return null;
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

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let list = data.members.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
    list = list.filter((m) => {
      const s = m.snapshot;
      switch (status) {
        case "available":
          return s !== null && s.sevenDayPct < data.thresholds.warn && s.fiveHourPct < data.thresholds.warn;
        case "near":
          return (
            s !== null &&
            (s.sevenDayPct >= data.thresholds.warn || s.fiveHourPct >= data.thresholds.warn)
          );
        case "stale":
          return m.stale && s !== null;
        case "none":
          return s === null;
        default:
          return true;
      }
    });
    const dir = sortAsc ? 1 : -1;
    const val = (m: Member) => {
      switch (sortKey) {
        case "name":
          return m.name.toLowerCase();
        case "session":
          return m.snapshot?.fiveHourPct ?? -1;
        case "weekly":
          return m.snapshot?.sevenDayPct ?? -1;
        case "lastReport":
          return m.snapshot ? new Date(m.snapshot.capturedAt).getTime() : 0;
        default: // headroom: most weekly capacity first
          return m.snapshot ? m.snapshot.sevenDayPct : 101;
      }
    };
    return list.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }, [data, query, status, sortKey, sortAsc]);

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const th = (label: string, key: SortKey, extra = "") => (
    <TableHead className={extra}>
      <button
        className="hover:text-foreground inline-flex items-center gap-1"
        onClick={() => sortBy(key)}
      >
        {label}
        <ArrowUpDown className={`size-3 ${sortKey === key ? "opacity-90" : "opacity-30"}`} />
      </button>
    </TableHead>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team capacity</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Who has Claude allowance left — session and weekly limits with reset dates
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
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

          <Card className="mb-4">
            <CardHeader className="pb-0">
              <CardTitle>Weekly usage trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamTrendChart
                series={stats.reporting.map((m) => ({
                  name: m.name,
                  values: m.spark,
                  at: m.sparkAt,
                }))}
              />
            </CardContent>
          </Card>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members…"
                className="w-56 ps-8"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="near">Near limits</SelectItem>
                <SelectItem value="stale">Stale</SelectItem>
                <SelectItem value="none">Not reporting</SelectItem>
              </SelectContent>
            </Select>
            <div className="ms-auto flex items-center gap-2">
              <div className="border-input flex rounded-md border p-0.5">
                <Button
                  variant={view === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setViewPersist("table")}
                >
                  <Table2 />
                  Table
                </Button>
                <Button
                  variant={view === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() => setViewPersist("cards")}
                >
                  <LayoutGrid />
                  Cards
                </Button>
              </div>
            </div>
          </div>

          {view === "table" ? (
            <div className="bg-card overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    {th("Member", "name", "ps-4")}
                    {th("Session (5h)", "session", "min-w-40")}
                    {th("Weekly", "weekly", "min-w-40")}
                    <TableHead>Headroom</TableHead>
                    <TableHead>Session resets</TableHead>
                    <TableHead>Weekly resets</TableHead>
                    {th("Last report", "lastReport", "pe-4 text-right")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const s = m.snapshot;
                    const tone = s
                      ? HEADROOM_CHIP[
                          statusOf(s.sevenDayPct, data.thresholds.warn, data.thresholds.critical)
                        ]
                      : "";
                    return (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/member/${m.id}`)}
                      >
                        <TableCell className="ps-4">
                          <div className="flex items-center gap-2.5">
                            <MonogramAvatar name={m.name} colorful className="size-8 text-xs" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{m.name}</div>
                              <div className="text-muted-foreground truncate text-xs">
                                {m.email}
                              </div>
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
                            <TableCell>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${tone}`}
                              >
                                {(100 - s.sevenDayPct).toFixed(0)}% left
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              in {fmtCountdown(s.fiveHourResetsAt)}
                              <div>{fmtResetDate(s.fiveHourResetsAt)}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
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
                                <Badge variant="outline" className="text-muted-foreground ms-2 text-[10px]">
                                  stale
                                </Badge>
                              )}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={6} className="text-muted-foreground pe-4 text-sm">
                            no data reported yet — install the collector
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-muted-foreground py-10 text-center text-sm"
                      >
                        No members match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered
                .filter((m) => m.snapshot)
                .map((m) => {
                  const s = m.snapshot!;
                  const weeklyLeft = Math.max(0, 100 - s.sevenDayPct);
                  const chipTone =
                    HEADROOM_CHIP[
                      statusOf(s.sevenDayPct, data.thresholds.warn, data.thresholds.critical)
                    ];
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
                        >
                          {weeklyLeft.toFixed(0)}% left
                        </span>
                        <ChevronRight className="text-muted-foreground/50 group-hover:text-muted-foreground size-4 shrink-0 transition-colors" />
                      </div>
                      <div className="space-y-4">
                        <Meter
                          label="Session · 5 hour"
                          pct={s.fiveHourPct}
                          resetsAt={s.fiveHourResetsAt}
                          warn={data.thresholds.warn}
                          critical={data.thresholds.critical}
                        />
                        <Separator />
                        <Meter
                          label="Weekly"
                          pct={s.sevenDayPct}
                          resetsAt={s.sevenDayResetsAt}
                          warn={data.thresholds.warn}
                          critical={data.thresholds.critical}
                        />
                        {m.spark.length > 1 && (
                          <div className="border-border/70 border-t pt-3">
                            <div className="text-muted-foreground/80 mb-1 text-[10px] font-medium tracking-wider uppercase">
                              Weekly trend
                            </div>
                            <Sparkline values={m.spark} label={`${m.name} weekly usage trend`} />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </>
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
    </main>
  );
}
