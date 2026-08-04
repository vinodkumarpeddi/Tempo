import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings() });
}

const ALLOWED_INTERVALS = [15, 30, 60, 120];

export async function PUT(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: Record<string, number | string | boolean> = {};
  if (ALLOWED_INTERVALS.includes(body.collectIntervalMin))
    data.collectIntervalMin = body.collectIntervalMin;
  if (Number.isInteger(body.digestHourUtc) && body.digestHourUtc >= 0 && body.digestHourUtc <= 23)
    data.digestHourUtc = body.digestHourUtc;
  if (Number.isInteger(body.warnThreshold) && body.warnThreshold > 0 && body.warnThreshold < 100)
    data.warnThreshold = body.warnThreshold;
  if (Number.isInteger(body.criticalThreshold) && body.criticalThreshold > 0 && body.criticalThreshold <= 100)
    data.criticalThreshold = body.criticalThreshold;
  if (typeof body.adminEmail === "string") data.adminEmail = body.adminEmail.trim();
  if (body.digestFormat === "inline" || body.digestFormat === "pdf")
    data.digestFormat = body.digestFormat;
  if (typeof body.digestEnabled === "boolean") data.digestEnabled = body.digestEnabled;
  if (typeof body.alertsEnabled === "boolean") data.alertsEnabled = body.alertsEnabled;

  await getSettings();
  const settings = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json({ settings });
}
