"use client";

const W = 240;
const H = 36;

export default function Sparkline({ values, label }: { values: number[]; label?: string }) {
  if (values.length < 2) return null;

  const max = Math.max(10, ...values);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 3 - (Math.min(max, Math.max(0, v)) / max) * (H - 6);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
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
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={2.5}
        fill="var(--chart-5)"
        stroke="var(--card)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
