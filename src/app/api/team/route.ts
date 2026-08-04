import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { scopedLimits } from "@/lib/usage";

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
          take: 48,
          select: {
            fiveHourPct: true,
            fiveHourResetsAt: true,
            sevenDayPct: true,
            sevenDayResetsAt: true,
            capturedAt: true,
            raw: true,
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
      // The freshest snapshot may be a partial (e.g. seeded/degraded); fall back
      // to the most recent one whose raw payload carries scoped model limits.
      const scoped =
        u.snapshots.map((x) => scopedLimits(x.raw)).find((l) => l.length > 0) ?? [];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        snapshot: s && {
          fiveHourPct: s.fiveHourPct,
          fiveHourResetsAt: s.fiveHourResetsAt,
          sevenDayPct: s.sevenDayPct,
          sevenDayResetsAt: s.sevenDayResetsAt,
          capturedAt: s.capturedAt,
        },
        scoped,
        spark: u.snapshots
          .slice()
          .reverse()
          .map((x) => x.sevenDayPct),
        sparkAt: u.snapshots
          .slice()
          .reverse()
          .map((x) => x.capturedAt),
        stale: s ? Date.now() - s.capturedAt.getTime() > staleMs : true,
      };
    }),
  });
}
