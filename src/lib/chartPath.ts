// Monotone cubic interpolation (Fritsch–Carlson): smooth curves through the
// points with no overshoot — a 100% sample never renders above 100%.
export function monotonePath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return "";
  if (n === 1) return `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    slope.push((ys[i + 1] - ys[i]) / (dx[i] || 1));
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
    } else {
      const a = tangent[i] / slope[i];
      const b = tangent[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangent[i] = tau * a * slope[i];
        tangent[i + 1] = tau * b * slope[i];
      }
    }
  }

  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    d += ` C${(xs[i] + h / 3).toFixed(1)},${(ys[i] + (tangent[i] * h) / 3).toFixed(1)} ${(
      xs[i + 1] -
      h / 3
    ).toFixed(1)},${(ys[i + 1] - (tangent[i + 1] * h) / 3).toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[
      i + 1
    ].toFixed(1)}`;
  }
  return d;
}

// Trailing moving average — takes the sample-to-sample noise out of a series
// before it is drawn, so trends read as trends.
export function movingAvg(values: number[], window = 3): number[] {
  if (values.length <= 2 || window <= 1) return values;
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const seg = values.slice(start, i + 1);
    return seg.reduce((a, b) => a + b, 0) / seg.length;
  });
}
