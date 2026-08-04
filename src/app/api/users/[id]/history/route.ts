import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const snapshots = await prisma.snapshot.findMany({
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
  });

  return NextResponse.json({ user, snapshots });
}
