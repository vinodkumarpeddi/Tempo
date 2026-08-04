export type ParsedUsage = {
  fiveHourPct: number;
  fiveHourResetsAt: Date;
  sevenDayPct: number;
  sevenDayResetsAt: Date;
};

type WindowShape = { utilization?: number; resets_at?: string };
type LimitShape = {
  kind?: string;
  group?: string;
  percent?: number;
  resets_at?: string;
};

// Tolerant parser for the (undocumented) /api/oauth/usage response.
// Prefers the top-level five_hour/seven_day objects, falls back to the
// `limits` array so a partial shape change degrades instead of breaking.
export function parseUsage(raw: unknown): ParsedUsage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as {
    five_hour?: WindowShape | null;
    seven_day?: WindowShape | null;
    limits?: LimitShape[] | null;
  };

  let fiveHour = windowOf(body.five_hour);
  let sevenDay = windowOf(body.seven_day);

  if ((!fiveHour || !sevenDay) && Array.isArray(body.limits)) {
    const session = body.limits.find((l) => l.group === "session");
    const weekly = body.limits.find((l) => l.kind === "weekly_all");
    fiveHour ??= windowOf(
      session && { utilization: session.percent, resets_at: session.resets_at },
    );
    sevenDay ??= windowOf(
      weekly && { utilization: weekly.percent, resets_at: weekly.resets_at },
    );
  }

  if (!fiveHour || !sevenDay) return null;
  return {
    fiveHourPct: fiveHour.pct,
    fiveHourResetsAt: fiveHour.resetsAt,
    sevenDayPct: sevenDay.pct,
    sevenDayResetsAt: sevenDay.resetsAt,
  };
}

function windowOf(
  w: WindowShape | null | undefined,
): { pct: number; resetsAt: Date } | null {
  if (!w || typeof w.utilization !== "number" || !w.resets_at) return null;
  const resetsAt = new Date(w.resets_at);
  if (isNaN(resetsAt.getTime())) return null;
  return { pct: w.utilization, resetsAt };
}
