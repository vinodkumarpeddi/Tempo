"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import HistoryChart, { HistoryPoint } from "@/components/HistoryChart";

type HistoryResponse = {
  user: { id: string; name: string; email: string };
  snapshots: HistoryPoint[];
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
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ms-2 mb-4">
        <Link href="/">
          <ArrowLeft />
          Team
        </Link>
      </Button>

      {error && <p className="mt-4 text-sm">Member not found.</p>}
      {data && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <MonogramAvatar name={data.user.name} colorful className="size-10 text-sm" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{data.user.name}</h1>
              <p className="text-muted-foreground text-sm">{data.user.email}</p>
            </div>
          </div>

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
  );
}
