"use client";

import { useMemo, useRef, useState } from "react";
import { monotonePath, movingAvg } from "@/lib/chartPath";

export type HistoryPoint = {
  capturedAt: string;
  fiveHourPct: number;
  sevenDayPct: number;
};

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

const SERIES = [
  { key: "fiveHourPct", label: "Session (5h)", color: "var(--chart-5)" },
  { key: "sevenDayPct", label: "Weekly", color: "var(--chart-2)" },
] as const;

export default function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { xs, paths } = useMemo(() => {
    if (points.length === 0) return { xs: [] as number[], paths: [] as string[] };
    const t0 = new Date(points[0].capturedAt).getTime();
    const t1 = new Date(points[points.length - 1].capturedAt).getTime();
    const span = Math.max(1, t1 - t0);
    const xs = points.map(
      (p) =>
        PAD.left +
        ((new Date(p.capturedAt).getTime() - t0) / span) * (W - PAD.left - PAD.right),
    );
    const y = (pct: number) =>
      PAD.top + (1 - Math.min(100, Math.max(0, pct)) / 100) * (H - PAD.top - PAD.bottom);
    const paths = SERIES.map((s) => {
      const smooth = movingAvg(
        points.map((p) => p[s.key]),
        3,
      );
      return monotonePath(
        xs,
        smooth.map((v) => y(v)),
      );
    });
    return { xs, paths };
  }, [points]);

  if (points.length < 2) {
    return (
      <p className="text-sm py-8" style={{ color: "var(--muted-foreground)" }}>
        Not enough history yet — check back after a few reports.
      </p>
    );
  }

  const yFor = (pct: number) =>
    PAD.top + (1 - pct / 100) * (H - PAD.top - PAD.bottom);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[best] - px)) best = i;
    setHover(best);
  };

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="flex gap-4 mb-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Usage history: session and weekly utilization over time"
        >
          {[0, 25, 50, 75, 100].map((pct) => (
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
          {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
            <text
              key={i}
              x={xs[i]}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {new Date(points[i].capturedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </text>
          ))}
          {SERIES.map((s, si) => (
            <path key={s.key} d={paths[si]} fill="none" stroke={s.color} strokeWidth={2} />
          ))}
          {hover !== null && (
            <g>
              <line
                x1={xs[hover]}
                x2={xs[hover]}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--input)"
                strokeWidth={1}
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={xs[hover]}
                  cy={yFor(Math.min(100, Math.max(0, points[hover][s.key])))}
                  r={4}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>
        {hovered && hover !== null && (
          <div
            className="absolute pointer-events-none text-xs rounded-md border px-3 py-2 shadow-sm"
            style={{
              left: `${(xs[hover] / W) * 100}%`,
              top: 0,
              transform: xs[hover] > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
              background: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <div style={{ color: "var(--muted-foreground)" }}>
              {new Date(hovered.capturedAt).toLocaleString()}
            </div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}: <b className="tabular-nums">{hovered[s.key].toFixed(0)}%</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
