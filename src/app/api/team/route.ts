import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: {
            fiveHourPct: true,
            fiveHourResetsAt: true,
            sevenDayPct: true,
            sevenDayResetsAt: true,
            capturedAt: true,
          },
        },
      },
    }),
    getSettings(),
  ]);

  const staleMs = Math.max(2 * settings.collectIntervalMin, 60) * 60_000;

  return NextResponse.json({
    thresholds: {
      warn: settings.warnThreshold,
      critical: settings.criticalThreshold,
    },
    members: users.map((u) => {
      const s = u.snapshots[0] ?? null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        snapshot: s,
        stale: s ? Date.now() - s.capturedAt.getTime() > staleMs : true,
      };
    }),
  });
}
