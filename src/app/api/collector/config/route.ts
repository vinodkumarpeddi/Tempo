import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { resolveCollectorUser } from "@/lib/auth";

// Collectors tick on a fixed short cadence (every 10 min) and ask the server
// whether a report is due. The admin-configured interval therefore takes
// effect on every machine without reinstalling anything.
export async function GET(req: NextRequest) {
  const { user, teamAuthed } = await resolveCollectorUser(req, { autoCreate: false });

  if (!user && !teamAuthed) {
    return NextResponse.json({ error: "invalid ingest key" }, { status: 401 });
  }

  const settings = await getSettings();

  // Team key with a member the server hasn't seen yet: report now — the
  // first ingest auto-creates them.
  if (!user) {
    return NextResponse.json({
      intervalMinutes: settings.collectIntervalMin,
      reportDue: true,
    });
  }

  if (!user.active) {
    return NextResponse.json({
      intervalMinutes: settings.collectIntervalMin,
      reportDue: false,
    });
  }

  const last = await prisma.snapshot.findFirst({
    where: { userId: user.id },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  const dueAt = last
    ? last.capturedAt.getTime() + settings.collectIntervalMin * 60_000
    : 0;

  return NextResponse.json({
    intervalMinutes: settings.collectIntervalMin,
    reportDue: Date.now() >= dueAt,
  });
}
