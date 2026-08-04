import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";

// Single-admin product: signup only works while no account exists.
export async function POST(req: NextRequest) {
  const existing = await prisma.adminAccount.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "An admin account already exists — sign in instead." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const account = await prisma.adminAccount.create({
    data: { name, email, passwordHash: hashPassword(password) },
  });

  const token = await createSession(account.id);
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, token);
  return res;
}
