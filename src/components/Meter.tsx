"use client";

import { CalendarClock } from "lucide-react";

export function statusOf(pct: number, warn: number, critical: number) {
  if (pct >= critical) return "critical" as const;
  if (pct >= warn) return "warning" as const;
  return "good" as const;
}

// EverHr status ramps: emerald=ok, amber=attention, rose=critical.
// Ink at 700 (light) / 400 (dark) per the design-system mapping.
const FILL = {
  good: "var(--color-emerald-500)",
  warning: "var(--color-amber-500)",
  critical: "var(--color-rose-500)",
};
const INK = {
  good: "var(--color-emerald-700)",
  warning: "var(--color-amber-700)",
  critical: "var(--color-rose-700)",
};
const INK_DARK = {
  good: "var(--color-emerald-400)",
  warning: "var(--color-amber-400)",
  critical: "var(--color-rose-400)",
};

const STATUS_TEXT = { good: "", warning: "high", critical: "critical" };

export function fmtCountdown(iso: string) {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtResetDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Meter({
  label,
  pct,
  resetsAt,
  warn,
  critical,
  compact = false,
}: {
  label?: string;
  pct: number;
  resetsAt: string;
  warn: number;
  critical: number;
  compact?: boolean;
}) {
  const status = statusOf(pct, warn, critical);
  const inkVars = {
    "--meter-ink": INK[status],
    "--meter-ink-dark": INK_DARK[status],
  } as React.CSSProperties;

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        {label && (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {label}
          </span>
        )}
        <span
          className={`${compact ? "text-sm" : "text-lg"} leading-none font-semibold tabular-nums [color:var(--meter-ink)] dark:[color:var(--meter-ink-dark)]`}
          style={inkVars}
        >
          {pct.toFixed(0)}%
          {STATUS_TEXT[status] && (
            <span className="ms-1.5 text-[10px] font-semibold tracking-wide uppercase">
              {STATUS_TEXT[status]}
            </span>
          )}
        </span>
      </div>
      <div
        className={`bg-secondary w-full overflow-hidden rounded-full ${compact ? "h-1.5" : "h-2"}`}
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label ?? "usage"} utilization`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: FILL[status],
          }}
        />
      </div>
      {!compact && (
        <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
          <CalendarClock className="size-3.5 shrink-0" />
          <span>
            resets in <span className="text-foreground font-medium">{fmtCountdown(resetsAt)}</span>
            {" · "}
            {fmtResetDate(resetsAt)}
          </span>
        </div>
      )}
    </div>
  );
}
