"use client";

import { CalendarClock } from "lucide-react";
import { fmtCountdown, fmtResetDate, isPastReset, statusOf } from "@/components/Meter";

const FILL = {
  good: "var(--color-emerald-500)",
  warning: "var(--color-amber-500)",
  critical: "var(--color-rose-500)",
};
const INK = {
  good: "text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]",
  warning: "text-[var(--color-amber-700)] dark:text-[var(--color-amber-400)]",
  critical: "text-[var(--color-rose-700)] dark:text-[var(--color-rose-400)]",
};

const R = 42;
const C = 2 * Math.PI * R;

export default function RingGauge({
  label,
  pct,
  resetsAt,
  warn,
  critical,
}: {
  label: string;
  pct: number;
  resetsAt: string | null;
  warn: number;
  critical: number;
}) {
  const status = statusOf(pct, warn, critical);
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="bg-card flex items-center gap-5 rounded-xl border p-5">
      <div className="relative size-[104px] shrink-0">
        <svg viewBox="0 0 104 104" className="size-full -rotate-90">
          <circle cx="52" cy="52" r={R} fill="none" stroke="var(--secondary)" strokeWidth="10" />
          <circle
            cx="52"
            cy="52"
            r={R}
            fill="none"
            stroke={FILL[status]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * C} ${C}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl leading-none font-semibold tabular-nums ${INK[status]}`}>
            {pct.toFixed(0)}%
          </span>
          <span className="text-muted-foreground mt-0.5 text-[10px]">used</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {label}
        </div>
        <div className="mt-1 text-lg leading-tight font-semibold tracking-tight">
          {Math.max(0, 100 - pct).toFixed(0)}% left
        </div>
        <div className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs leading-snug">
          <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
          {resetsAt === null ? (
            <span>not used yet this week</span>
          ) : isPastReset(resetsAt) ? (
            <span>
              already reset
              <br />
              {fmtResetDate(resetsAt)}
            </span>
          ) : (
            <span>
              resets in{" "}
              <span className="text-foreground font-medium">{fmtCountdown(resetsAt)}</span>
              <br />
              {fmtResetDate(resetsAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
