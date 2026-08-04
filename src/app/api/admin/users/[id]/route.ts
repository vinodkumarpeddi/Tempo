import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed, newIngestKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: { active?: boolean; ingestKey?: string; name?: string } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.regenerateKey === true) data.ingestKey = newIngestKey();

  try {
    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const user = await prisma.user.delete({ where: { id } });
    // Tombstone the email so the team-key collector on their machine can't
    // silently re-create them; re-adding the member lifts it.
    await prisma.blockedEmail.upsert({
      where: { email: user.email },
      update: {},
      create: { email: user.email },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
