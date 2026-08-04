"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import HistoryChart, { HistoryPoint } from "@/components/HistoryChart";
import Meter from "@/components/Meter";

type HistoryResponse = {
  user: { id: string; name: string; email: string };
  snapshots: HistoryPoint[];
  latest: {
    fiveHourPct: number;
    fiveHourResetsAt: string;
    sevenDayPct: number;
    sevenDayResetsAt: string;
    capturedAt: string;
  } | null;
  scoped: { label: string; pct: number; resetsAt: string }[];
  thresholds: { warn: number; critical: number };
};

const RANGES = [7, 14, 30] as const;

export default function MemberPage({ params }: PageProps<"/member/[id]">) {
  const { id } = use(params);
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/users/${id}/history?days=${days}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id, days]);

  return (
    <>
      <div className="border-border/70 border-b">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-8 pt-6 pb-5">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ms-2">
              <Link href="/dashboard">
                <ArrowLeft />
                Team
              </Link>
            </Button>
            {data && (
              <div className="flex items-center gap-3">
                <MonogramAvatar name={data.user.name} className="size-10 text-sm" />
                <div>
                  <h1 className="text-lg leading-tight font-semibold tracking-tight">
                    {data.user.name}
                  </h1>
                  <p className="text-muted-foreground text-xs">{data.user.email}</p>
                </div>
              </div>
            )}
          </div>
          {data?.latest && (
            <p className="text-muted-foreground text-xs">
              last report{" "}
              {new Date(data.latest.capturedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
      <main className="w-full px-8 py-6">
      {error && <p className="mt-4 text-sm">Member not found.</p>}
      {data && (
        <>

          {data.latest && (
            <div
              className={`mb-4 grid gap-4 sm:grid-cols-2 ${data.scoped.length > 0 ? "lg:grid-cols-3" : ""}`}
            >
              <div className="bg-card rounded-xl border p-5">
                <Meter
                  label="Session · 5 hour"
                  pct={data.latest.fiveHourPct}
                  resetsAt={data.latest.fiveHourResetsAt}
                  warn={data.thresholds.warn}
                  critical={data.thresholds.critical}
                />
              </div>
              <div className="bg-card rounded-xl border p-5">
                <Meter
                  label="Weekly"
                  pct={data.latest.sevenDayPct}
                  resetsAt={data.latest.sevenDayResetsAt}
                  warn={data.thresholds.warn}
                  critical={data.thresholds.critical}
                />
              </div>
              {data.scoped.map((sc) => (
                <div key={sc.label} className="bg-card rounded-xl border p-5">
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
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Usage history</CardTitle>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={days === r ? "secondary" : "ghost"}
                    onClick={() => setDays(r)}
                  >
                    {r}d
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <HistoryChart points={data.snapshots} />
            </CardContent>
          </Card>
        </>
      )}
      </main>
    </>
  );
}
