"use client";

import { monotonePath, movingAvg } from "@/lib/chartPath";

const W = 240;
const H = 36;

export default function Sparkline({ values, label }: { values: number[]; label?: string }) {
  if (values.length < 2) return null;

  const smooth = movingAvg(values, 3);
  const max = Math.max(10, ...smooth);
  const xs = smooth.map((_, i) => (i / (smooth.length - 1)) * W);
  const ys = smooth.map((v) => H - 3 - (Math.min(max, Math.max(0, v)) / max) * (H - 6));
  const line = monotonePath(xs, ys);
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      role="img"
      aria-label={label ?? "usage trend"}
    >
      <path d={area} fill="var(--chart-5)" opacity={0.1} />
      <path d={line} fill="none" stroke="var(--chart-5)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={2.5}
        fill="var(--chart-5)"
        stroke="var(--card)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
