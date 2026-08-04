import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const alerts = await prisma.alertLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      kind: a.kind,
      member: a.user.name,
      email: a.user.email,
      windowKey: a.dedupeKey,
      sentAt: a.sentAt,
    })),
  });
}
