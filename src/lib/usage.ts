export type ParsedUsage = {
  fiveHourPct: number;
  fiveHourResetsAt: Date;
  sevenDayPct: number;
  sevenDayResetsAt: Date;
};

type WindowShape = { utilization?: number; resets_at?: string | null };
type LimitShape = {
  kind?: string;
  group?: string;
  percent?: number;
  resets_at?: string | null;
  scope?: { model?: { display_name?: string | null } | null } | null;
};

export type ScopedLimit = { label: string; pct: number; resetsAt: string | null };

// Model-scoped weekly limits (e.g. a separate Fable/Opus cap) live only in the
// `limits` array of the raw payload; surface them from the stored raw JSON.
// An entitled-but-unused cap arrives as percent 0 with resets_at null — keep
// it, otherwise "has Fable, unused" is indistinguishable from "no Fable plan".
export function scopedLimits(rawJson: string): ScopedLimit[] {
  try {
    const raw = JSON.parse(rawJson) as { limits?: LimitShape[] };
    if (!Array.isArray(raw.limits)) return [];
    return raw.limits
      .filter(
        (l) =>
          l?.kind === "weekly_scoped" &&
          typeof l.percent === "number" &&
          l.scope?.model?.display_name,
      )
      .map((l) => ({
        label: l.scope!.model!.display_name as string,
        pct: l.percent as number,
        resetsAt: typeof l.resets_at === "string" ? l.resets_at : null,
      }));
  } catch {
    return [];
  }
}

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
