import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const data: Record<string, number | string | boolean> = {};
  if (Number.isInteger(body.collectIntervalMin))
    data.collectIntervalMin = Math.min(720, Math.max(5, body.collectIntervalMin));
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    Array.isArray(body.digestTimes) &&
    body.digestTimes.length >= 1 &&
    body.digestTimes.length <= 12 &&
    body.digestTimes.every((t: unknown) => typeof t === "string" && timeRe.test(t))
  ) {
    data.digestTimes = [...new Set(body.digestTimes as string[])].sort().join(",");
  }
  if (
    Array.isArray(body.digestDays) &&
    body.digestDays.length >= 1 &&
    body.digestDays.length <= 7 &&
    body.digestDays.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
  ) {
    data.digestDays = [...new Set(body.digestDays as number[])].sort((a, b) => a - b).join(",");
  }
  if (Number.isInteger(body.warnThreshold) && body.warnThreshold > 0 && body.warnThreshold < 100)
    data.warnThreshold = body.warnThreshold;
  if (Number.isInteger(body.criticalThreshold) && body.criticalThreshold > 0 && body.criticalThreshold <= 100)
    data.criticalThreshold = body.criticalThreshold;
  if (typeof body.adminEmail === "string") data.adminEmail = body.adminEmail.trim();
  if (body.digestFormat === "inline" || body.digestFormat === "pdf")
    data.digestFormat = body.digestFormat;
  if (body.digestAudience === "all" || body.digestAudience === "admin")
    data.digestAudience = body.digestAudience;
  if (typeof body.digestEnabled === "boolean") data.digestEnabled = body.digestEnabled;
  if (typeof body.alertsEnabled === "boolean") data.alertsEnabled = body.alertsEnabled;

  await getSettings();
  const settings = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json({ settings });
}
