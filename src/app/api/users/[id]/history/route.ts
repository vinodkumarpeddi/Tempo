import { NextRequest, NextResponse } from "next/server";
import { getSettings, prisma, scopedByUser } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const days = Math.min(
    30,
    Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 7)),
  );

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [snapshots, latest] = await Promise.all([
    prisma.snapshot.findMany({
      where: {
        userId: id,
        capturedAt: { gte: new Date(Date.now() - days * 86_400_000) },
      },
      orderBy: { capturedAt: "asc" },
      select: {
        fiveHourPct: true,
        sevenDayPct: true,
        capturedAt: true,
      },
    }),
    prisma.snapshot.findFirst({
      where: { userId: id },
      orderBy: { capturedAt: "desc" },
      select: {
        fiveHourPct: true,
        fiveHourResetsAt: true,
        sevenDayPct: true,
        sevenDayResetsAt: true,
        capturedAt: true,
      },
    }),
  ]);

  const scoped = (await scopedByUser([id])).get(id) ?? [];

  const settings = await getSettings();

  return NextResponse.json({
    user,
    snapshots,
    latest,
    scoped,
    thresholds: {
      warn: settings.warnThreshold,
      critical: settings.criticalThreshold,
    },
  });
}
