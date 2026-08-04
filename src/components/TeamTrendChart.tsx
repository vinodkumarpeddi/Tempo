"use client";

import { useMemo, useRef, useState } from "react";
import { monotonePath, movingAvg } from "@/lib/chartPath";

export type TrendSeries = { name: string; values: number[]; at: string[] };

const W = 860;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 24, left: 38 };
const COLORS = [
  "var(--chart-5)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-6)",
  "var(--chart-3)",
  "var(--chart-1)",
];
const MAX_SERIES = 6;

export default function TeamTrendChart({ series }: { series: TrendSeries[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const shown = series.filter((s) => s.values.length > 1).slice(0, MAX_SERIES);
  const folded = series.filter((s) => s.values.length > 1).length - shown.length;
  const n = Math.max(...shown.map((s) => s.values.length), 0);

  const yFor = (pct: number) =>
    PAD.top + (1 - Math.min(100, Math.max(0, pct)) / 100) * (H - PAD.top - PAD.bottom);
  const xFor = (i: number, len: number) =>
    PAD.left + (len < 2 ? 0 : (i / (len - 1)) * (W - PAD.left - PAD.right));

  const paths = useMemo(
    () =>
      shown.map((s) => {
        const smooth = movingAvg(s.values, 3);
        return monotonePath(
          smooth.map((_, i) => xFor(i, smooth.length)),
          smooth.map((v) => yFor(v)),
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series],
  );

  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-sm">
        Not enough history yet — the chart appears after a few reports.
      </p>
    );
  }

  const longest = shown.reduce((a, b) => (a.values.length >= b.values.length ? a : b));
  const hoverFrac = hover !== null && n > 1 ? hover / (n - 1) : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (px - PAD.left) / (W - PAD.left - PAD.right)));
    setHover(Math.round(frac * (n - 1)));
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {shown.map((s, i) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: COLORS[i] }} />
            {s.name}
          </span>
        ))}
        {folded > 0 && <span>+{folded} more</span>}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Weekly utilization trend for each member"
        >
          {[0, 50, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yFor(pct)}
                y2={yFor(pct)}
                stroke={pct === 0 ? "var(--input)" : "var(--border)"}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={yFor(pct) + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {pct}%
              </text>
            </g>
          ))}
          {[0, longest.at.length - 1].map((i) => (
            <text
              key={i}
              x={xFor(i, longest.at.length)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {fmtTime(longest.at[i])}
            </text>
          ))}
          {shown.map((s, i) => (
            <path key={s.name} d={paths[i]} fill="none" stroke={COLORS[i]} strokeWidth={2} />
          ))}
          {hoverFrac !== null && (
            <g>
              <line
                x1={PAD.left + hoverFrac * (W - PAD.left - PAD.right)}
                x2={PAD.left + hoverFrac * (W - PAD.left - PAD.right)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--input)"
                strokeWidth={1}
              />
              {shown.map((s, i) => {
                const idx = Math.round(hoverFrac * (s.values.length - 1));
                return (
                  <circle
                    key={s.name}
                    cx={xFor(idx, s.values.length)}
                    cy={yFor(s.values[idx])}
                    r={3.5}
                    fill={COLORS[i]}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}
        </svg>
        {hoverFrac !== null && (
          <div
            className="border-border bg-popover pointer-events-none absolute top-0 rounded-md border px-3 py-2 text-xs shadow-sm"
            style={{
              left: `${((PAD.left + hoverFrac * (W - PAD.left - PAD.right)) / W) * 100}%`,
              transform: hoverFrac > 0.5 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <div className="text-muted-foreground mb-1">
              {fmtTime(longest.at[Math.round(hoverFrac * (longest.at.length - 1))])}
            </div>
            {shown.map((s, i) => {
              const idx = Math.round(hoverFrac * (s.values.length - 1));
              return (
                <div key={s.name} className="mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full" style={{ background: COLORS[i] }} />
                  {s.name}: <b className="tabular-nums">{s.values[idx].toFixed(0)}%</b>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
