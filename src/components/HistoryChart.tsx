"use client";

import { useMemo, useState } from "react";

export type HistoryPoint = {
  capturedAt: string;
  fiveHourPct: number;
  sevenDayPct: number;
};

const W = 720;
const H = 210;
const PAD = { top: 18, right: 8, bottom: 26, left: 34 };

const SERIES = [
  { key: "session" as const, label: "Session peak", color: "var(--chart-6)" },
  { key: "weekly" as const, label: "Weekly peak", color: "var(--chart-2)" },
];

type Day = { label: string; full: string; session: number; weekly: number };

export default function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo<Day[]>(() => {
    const map = new Map<string, Day>();
    for (const p of points) {
      const d = new Date(p.capturedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key);
      if (existing) {
        existing.session = Math.max(existing.session, p.fiveHourPct);
        existing.weekly = Math.max(existing.weekly, p.sevenDayPct);
      } else {
        map.set(key, {
          label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          full: d.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          session: p.fiveHourPct,
          weekly: p.sevenDayPct,
        });
      }
    }
    return [...map.values()];
  }, [points]);

  if (days.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-sm">
        Not enough history yet — check back after a few reports.
      </p>
    );
  }

  const dataMax = Math.max(...days.map((d) => Math.max(d.session, d.weekly)), 1);
  const maxY = Math.min(100, Math.max(25, Math.ceil((dataMax * 1.2) / 25) * 25));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / days.length;
  const barW = Math.min(22, Math.max(6, slot * 0.28));
  const gap = Math.min(6, barW * 0.35);
  const yFor = (v: number) => PAD.top + (1 - Math.min(maxY, v) / maxY) * plotH;
  const ticks = maxY <= 50 ? [0, 25, 50].filter((t) => t <= maxY) : [0, 50, 100];
  const showLabels = days.length <= 8;
  const labelEvery = days.length > 16 ? Math.ceil(days.length / 8) : 1;

  return (
    <div>
      <div className="text-muted-foreground mb-3 flex gap-4 text-xs">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-[3px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ms-auto">highest point reached each day</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Daily peak usage: session and weekly"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke={t === 0 ? "var(--input)" : "var(--border)"}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 7}
                y={yFor(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {t}%
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const dim = hover !== null && hover !== i;
            return (
              <g
                key={i}
                opacity={dim ? 0.35 : 1}
                onMouseEnter={() => setHover(i)}
                style={{ transition: "opacity 0.12s ease" }}
              >
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                />
                {(
                  [
                    [d.session, SERIES[0].color, cx - barW - gap / 2],
                    [d.weekly, SERIES[1].color, cx + gap / 2],
                  ] as const
                ).map(([v, color, x], bi) => (
                  <g key={bi}>
                    <rect
                      x={x}
                      y={yFor(v)}
                      width={barW}
                      height={Math.max(2, yFor(0) - yFor(v))}
                      rx={3}
                      fill={color}
                    />
                    {showLabels && v >= 1 && (
                      <text
                        x={x + barW / 2}
                        y={yFor(v) - 5}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontWeight={600}
                        fill="var(--muted-foreground)"
                      >
                        {v.toFixed(0)}
                      </text>
                    )}
                  </g>
                ))}
                {i % labelEvery === 0 && (
                  <text
                    x={cx}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--muted-foreground)"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover !== null && days[hover] && (
          <div
            className="border-border bg-popover pointer-events-none absolute top-1 rounded-md border px-3 py-2 text-xs shadow-sm"
            style={{
              left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`,
              transform:
                hover > days.length / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <div className="text-muted-foreground mb-1">{days[hover].full}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-[3px]" style={{ background: s.color }} />
                {s.label}: <b className="tabular-nums">{days[hover][s.key].toFixed(0)}%</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
