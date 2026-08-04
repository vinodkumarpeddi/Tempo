import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { resolveCollectorUser } from "@/lib/auth";
import { parseUsage } from "@/lib/usage";
import { evaluateAlerts } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const { user, teamAuthed } = await resolveCollectorUser(req, { autoCreate: true });
  if (!user) {
    return NextResponse.json(
      { error: teamAuthed ? "member email required" : "invalid ingest key" },
      { status: teamAuthed ? 400 : 401 },
    );
  }
  if (!user.active) {
    return NextResponse.json({ error: "member is disabled" }, { status: 403 });
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
