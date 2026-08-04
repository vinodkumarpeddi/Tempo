import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed, newIngestKey } from "@/lib/auth";
import { emailShell, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, ingestKey: true, active: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !email) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({
      data: { name, email, ingestKey: newIngestKey() },
    });

    // Best-effort onboarding mail with the personal install command.
    const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    if (appUrl) {
      const cmd = `curl -sSL ${appUrl}/install.sh | bash -s -- ${appUrl} ${user.ingestKey}`;
      await sendEmail(
        [user.email],
        "You've been added to Claude Team Usage",
        emailShell(
          "Welcome to Claude Team Usage",
          `<p>Hi ${user.name} — your team tracks Claude session and weekly limits so everyone
             knows who has capacity left.</p>
           <p>Run this once in a terminal on the machine where you use Claude Code:</p>
           <pre style="background:#1a1a19;color:#eee;padding:12px 16px;border-radius:8px;overflow-x:auto;font-size:12px;">${cmd}</pre>
           <p style="font-size:13px;color:#6b7280;">On macOS the first run may show a Keychain
             prompt for "Claude Code-credentials" — click <b>Always Allow</b>. Your Claude login
             token never leaves your machine; only usage percentages are reported.</p>`,
        ),
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "email already exists" }, { status: 409 });
  }
}
