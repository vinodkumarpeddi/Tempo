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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Meter, { fmtCountdown, fmtResetDate, isPastReset, statusOf } from "@/components/Meter";
import PageHeader from "@/components/PageHeader";

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
  scoped: { label: string; pct: number; resetsAt: string | null }[];
};

type TeamResponse = {
  thresholds: { warn: number; critical: number };
  members: Member[];
};

type ViewMode = "table" | "cards";
type StatusFilter = "all" | "available" | "near" | "stale" | "none";
type SortKey = "headroom" | "name" | "session" | "weekly" | "lastReport";

const STATUS_DOT = {
  good: "var(--color-emerald-500)",
  warning: "var(--color-amber-500)",
  critical: "var(--color-rose-500)",
};

function HeadroomPill({ pct, warn, critical }: { pct: number; warn: number; critical: number }) {
  return (
    <span className="border-border bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap tabular-nums">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: STATUS_DOT[statusOf(pct, warn, critical)] }}
      />
      {Math.max(0, 100 - pct).toFixed(0)}% left
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
        {icon}
        {label}
      </div>
      <div className="mt-2.5 truncate text-[26px] leading-none font-semibold tracking-tight">
        {value}
      </div>
      {hint && <div className="text-muted-foreground mt-2 truncate text-xs">{hint}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

function ResetCell({ iso }: { iso: string }) {
  const past = isPastReset(iso);
  return (
    <>
      <div className={`text-xs ${past ? "text-muted-foreground" : "font-medium"}`}>
        {past ? "already reset" : `in ${fmtCountdown(iso)}`}
      </div>
      <div className={`text-[13px] tabular-nums ${past ? "text-muted-foreground" : ""}`}>
        {fmtResetDate(iso)}
      </div>
    </>
  );
}

function UsageChip({
  label,
  pct,
  warn,
  critical,
}: {
  label: string;
  pct: number;
  warn: number;
  critical: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: STATUS_DOT[statusOf(pct, warn, critical)] }}
      />
      <span className="text-foreground font-medium tabular-nums">{pct.toFixed(0)}%</span>
      {label}
    </span>
  );
}

function ResetsTile({
  members,
  warn,
  critical,
}: {
  members: Member[];
  warn: number;
  critical: number;
}) {
  return (
    <div className="bg-card flex flex-col rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
        <CalendarClock className="size-3.5" />
        Weekly resets soon
      </div>
      {members.length === 0 ? (
        <>
          <div className="mt-2.5 text-[26px] leading-none font-semibold tracking-tight">—</div>
          <div className="text-muted-foreground mt-2 text-xs">no upcoming resets</div>
        </>
      ) : (
        <ul className="mt-2 divide-y">
          {members.map((m) => {
            const s = m.snapshot!;
            return (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm last:pb-0">
                <Link
                  href={`/member/${m.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {m.name}
                </Link>
                <div className="text-muted-foreground flex shrink-0 items-center gap-2.5 text-xs">
                  <UsageChip label="weekly" pct={s.sevenDayPct} warn={warn} critical={critical} />
                  {m.scoped.map((sc) => (
                    <UsageChip
                      key={sc.label}
                      label={sc.label}
                      pct={sc.pct}
                      warn={warn}
                      critical={critical}
                    />
                  ))}
                </div>
                <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
                  in {fmtCountdown(s.sevenDayResetsAt)}
                </span>
                <span className="text-muted-foreground w-[7.5rem] shrink-0 text-right text-xs tabular-nums">
                  {fmtResetDate(s.sevenDayResetsAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
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
    // Collectors report every 5 minutes at best, and a backgrounded tab polling
    // through the night is pure database egress for a screen nobody is reading.
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    const t = setInterval(tick, 120_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
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
    const stale = reporting.filter((m) => m.stale);
    const mostAvailable = reporting[0] ?? null;
    const atRisk = reporting.filter(
      (m) =>
        m.snapshot!.sevenDayPct >= data.thresholds.warn ||
        m.snapshot!.fiveHourPct >= data.thresholds.warn,
    );
    const upcomingResets = reporting
      .filter((m) => !isPastReset(m.snapshot!.sevenDayResetsAt))
      .sort(
        (a, b) =>
          new Date(a.snapshot!.sevenDayResetsAt).getTime() -
          new Date(b.snapshot!.sevenDayResetsAt).getTime(),
      )
      .slice(0, 3);
    return {
      reporting,
      notReporting,
      stale,
      mostAvailable,
      atRisk,
      upcomingResets,
    };
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
    <>
      <PageHeader
        title="Team capacity"
        description="Who has Claude allowance left — session and weekly limits with reset dates"
      >
        {updatedAt && (
          <p className="text-muted-foreground text-xs">
            Updated{" "}
            {updatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ·
            refreshes every 2 minutes
          </p>
        )}
      </PageHeader>
      <main className="w-full px-8 py-6">
      {error && <p className="text-sm">Failed to load team data.</p>}

      {data && stats && data.members.length > 0 && (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
            <StatTile
              icon={<Users className="size-3.5" />}
              label="Members"
              value={String(data.members.length)}
              hint={[
                `${stats.reporting.length} reporting`,
                stats.stale.length ? `${stats.stale.length} stale` : null,
                stats.notReporting.length ? `${stats.notReporting.length} not reporting` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <StatTile
              icon={<BatteryCharging className="size-3.5" />}
              label="Most available"
              value={stats.mostAvailable ? stats.mostAvailable.name : "—"}
              hint={
                stats.mostAvailable
                  ? `${(100 - stats.mostAvailable.snapshot!.sevenDayPct).toFixed(0)}% of weekly limit left`
                  : "no reports yet"
              }
            >
              {stats.mostAvailable && (
                <div
                  className="bg-secondary h-1.5 w-full overflow-hidden rounded-full"
                  role="meter"
                  aria-valuenow={Math.round(stats.mostAvailable.snapshot!.sevenDayPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="weekly utilization"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, stats.mostAvailable.snapshot!.sevenDayPct))}%`,
                      background:
                        STATUS_DOT[
                          statusOf(
                            stats.mostAvailable.snapshot!.sevenDayPct,
                            data.thresholds.warn,
                            data.thresholds.critical,
                          )
                        ],
                    }}
                  />
                </div>
              )}
            </StatTile>
            <StatTile
              icon={<TriangleAlert className="size-3.5" />}
              label="Near limits"
              value={String(stats.atRisk.length)}
              hint={stats.atRisk.length ? undefined : "everyone in the clear"}
            >
              {stats.atRisk.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {stats.atRisk.map((m) => (
                    <Link
                      key={m.id}
                      href={`/member/${m.id}`}
                      className="border-border inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium hover:underline"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            STATUS_DOT[
                              statusOf(
                                Math.max(m.snapshot!.sevenDayPct, m.snapshot!.fiveHourPct),
                                data.thresholds.warn,
                                data.thresholds.critical,
                              )
                            ],
                        }}
                      />
                      {m.name}
                    </Link>
                  ))}
                </div>
              )}
            </StatTile>
            <ResetsTile
              members={stats.upcomingResets}
              warn={data.thresholds.warn}
              critical={data.thresholds.critical}
            />
          </div>

          <div
            className={
              view === "table"
                ? "bg-card flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 px-4 py-3"
                : "mb-4 flex flex-wrap items-center gap-2"
            }
          >
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
            <div className="bg-card overflow-x-auto rounded-b-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="[&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-wider [&_th]:uppercase">
                    {th("Member", "name", "ps-4")}
                    {th("Session (5h)", "session", "min-w-40")}
                    {th("Weekly", "weekly", "min-w-40")}
                    <TableHead className="min-w-32">Model limits</TableHead>
                    <TableHead>Headroom</TableHead>
                    <TableHead>Session resets</TableHead>
                    <TableHead>Weekly resets</TableHead>
                    {th("Last report", "lastReport", "pe-4 text-right")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const s = m.snapshot;
                    return (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/member/${m.id}`)}
                      >
                        <TableCell className="ps-4">
                          <div className="flex items-center gap-2.5">
                            <MonogramAvatar name={m.name} className="size-8 text-xs" />
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
                              {m.scoped.length > 0 ? (
                                <div className="space-y-2">
                                  {m.scoped.map((sc) => (
                                    <div
                                      key={sc.label}
                                      title={`${sc.label} weekly · ${sc.resetsAt ? `resets ${fmtResetDate(sc.resetsAt)}` : "not used yet this week"}`}
                                    >
                                      <div className="mb-0.5 flex items-baseline justify-between gap-2">
                                        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                                          {sc.label}
                                        </span>
                                      </div>
                                      <Meter
                                        pct={sc.pct}
                                        resetsAt={sc.resetsAt}
                                        warn={data.thresholds.warn}
                                        critical={data.thresholds.critical}
                                        compact
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <HeadroomPill
                                pct={s.sevenDayPct}
                                warn={data.thresholds.warn}
                                critical={data.thresholds.critical}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <ResetCell iso={s.fiveHourResetsAt} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <ResetCell iso={s.sevenDayResetsAt} />
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
                          <TableCell colSpan={7} className="text-muted-foreground pe-4 text-sm">
                            no data reported yet — install the collector
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
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
                  return (
                    <Link
                      key={m.id}
                      href={`/member/${m.id}`}
                      className="group bg-card hover:border-ring/40 rounded-xl border p-5 transition-colors hover:shadow-sm"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <MonogramAvatar name={m.name} className="size-10 text-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{m.name}</div>
                          <div className="text-muted-foreground truncate text-xs">{m.email}</div>
                        </div>
                        <HeadroomPill
                          pct={s.sevenDayPct}
                          warn={data.thresholds.warn}
                          critical={data.thresholds.critical}
                        />
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
                        {m.scoped.map((sc) => (
                          <div key={sc.label}>
                            <Separator className="mb-4" />
                            <Meter
                              label={`Weekly · ${sc.label}`}
                              pct={sc.pct}
                              resetsAt={sc.resetsAt}
                              warn={data.thresholds.warn}
                              critical={data.thresholds.critical}
                            />
                          </div>
                        ))}
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
    </>
  );
}
