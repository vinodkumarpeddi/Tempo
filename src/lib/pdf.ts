import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toIst } from "./ist";

export type PdfRow = {
  name: string;
  email: string;
  fiveHourPct: number | null;
  fiveHourResetsAt: Date | null;
  sevenDayPct: number | null;
  sevenDayResetsAt: Date | null;
  scoped?: { label: string; pct: number }[];
};

const GREEN = rgb(0.09, 0.64, 0.29);
const AMBER = rgb(0.85, 0.47, 0.02);
const RED = rgb(0.86, 0.15, 0.15);
const GRAY = rgb(0.42, 0.45, 0.5);
const TRACK = rgb(0.9, 0.91, 0.92);

export async function buildUsagePdf(
  rows: PdfRow[],
  opts: { date: string; warn: number; critical: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]); // A4
  const left = 50;
  let y = 792;

  page.drawText("Claude usage — daily report", { x: left, y, size: 18, font: bold });
  y -= 22;
  page.drawText(opts.date + " (IST)", { x: left, y, size: 11, font, color: GRAY });
  y -= 34;

  const colorFor = (pct: number) =>
    pct >= opts.critical ? RED : pct >= opts.warn ? AMBER : GREEN;

  const drawBar = (x: number, yy: number, pct: number) => {
    const w = 120;
    page.drawRectangle({ x, y: yy, width: w, height: 8, color: TRACK });
    page.drawRectangle({
      x,
      y: yy,
      width: (Math.min(100, Math.max(0, pct)) / 100) * w,
      height: 8,
      color: colorFor(pct),
    });
    page.drawText(`${pct.toFixed(0)}%`, {
      x: x + w + 8,
      y: yy,
      size: 10,
      font: bold,
      color: colorFor(pct),
    });
  };

  const fmtWhen = (d: Date) => toIst(d).toISOString().slice(0, 16).replace("T", " ");

  const header = () => {
    page.drawText("Member", { x: left, y, size: 10, font: bold, color: GRAY });
    page.drawText("Session (5h)", { x: left + 170, y, size: 10, font: bold, color: GRAY });
    page.drawText("Weekly", { x: left + 350, y, size: 10, font: bold, color: GRAY });
    y -= 8;
    page.drawLine({
      start: { x: left, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: GRAY,
    });
    y -= 22;
  };
  header();

  for (const row of rows) {
    if (y < 70) {
      page = doc.addPage([595, 842]);
      y = 792;
      header();
    }
    page.drawText(row.name, { x: left, y: y + 4, size: 11, font: bold });
    page.drawText(row.email, { x: left, y: y - 8, size: 8, font, color: GRAY });

    if (row.fiveHourPct === null || row.sevenDayPct === null) {
      page.drawText("no data reported yet", {
        x: left + 170,
        y: y + 2,
        size: 10,
        font,
        color: GRAY,
      });
    } else {
      drawBar(left + 170, y + 4, row.fiveHourPct);
      if (row.fiveHourResetsAt)
        page.drawText(`resets ${fmtWhen(row.fiveHourResetsAt)}`, {
          x: left + 170, y: y - 8, size: 7.5, font, color: GRAY,
        });
      drawBar(left + 350, y + 4, row.sevenDayPct);
      if (row.sevenDayResetsAt)
        page.drawText(`resets ${fmtWhen(row.sevenDayResetsAt)}`, {
          x: left + 350, y: y - 8, size: 7.5, font, color: GRAY,
        });
    }
    if (row.scoped?.length) {
      page.drawText(
        row.scoped.map((l) => `${l.label}: ${l.pct.toFixed(0)}%`).join("   ·   "),
        { x: left + 170, y: y - 20, size: 8, font, color: GRAY },
      );
      y -= 12;
    }
    y -= 36;
  }

  return doc.save();
}
