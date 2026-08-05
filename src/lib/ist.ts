export const IST_OFFSET_MS = 5.5 * 3_600_000;

export const toIst = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS);

export const fmtIst = (d: Date) =>
  toIst(d).toISOString().slice(0, 16).replace("T", " ") + " IST";
