import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { userFromIngestKey } from "@/lib/auth";
import { parseUsage } from "@/lib/usage";
import { evaluateAlerts } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const user = await userFromIngestKey(req);
  if (!user || !user.active) {
    return NextResponse.json({ error: "invalid ingest key" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = parseUsage(raw);
  if (!parsed) {
    // Shape changed upstream — store nothing, but tell the collector loudly.
    console.error(`[ingest] unparseable payload from ${user.email}`);
    return NextResponse.json({ error: "unrecognized usage shape" }, { status: 422 });
  }

  const prev = await prisma.snapshot.findFirst({
    where: { userId: user.id },
    orderBy: { capturedAt: "desc" },
    select: {
      fiveHourPct: true,
      fiveHourResetsAt: true,
      sevenDayPct: true,
      sevenDayResetsAt: true,
    },
  });

  await prisma.snapshot.create({
    data: { userId: user.id, ...parsed, raw: JSON.stringify(raw) },
  });

  const settings = await getSettings();
  await evaluateAlerts(user, prev, parsed, settings);

  return NextResponse.json({ ok: true });
}
