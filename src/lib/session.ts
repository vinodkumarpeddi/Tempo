import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";

export const SESSION_COOKIE = "ctu_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(accountId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      accountId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

async function accountForToken(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { account: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.account;
}

/** For server components/layouts. */
export async function getSessionAccount() {
  const store = await cookies();
  return accountForToken(store.get(SESSION_COOKIE)?.value);
}

/** For route handlers. */
export async function accountFromRequest(req: NextRequest) {
  return accountForToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export async function destroySession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
