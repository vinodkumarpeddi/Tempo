import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./db";

export function newIngestKey() {
  return "ctu_" + randomBytes(24).toString("hex");
}

function bearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function userFromIngestKey(req: NextRequest) {
  const key = bearerToken(req);
  if (!key) return null;
  return prisma.user.findUnique({ where: { ingestKey: key } });
}

export function isAdmin(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return (
    bearerToken(req) === secret || req.headers.get("x-admin-secret") === secret
  );
}

/** Session cookie (the admin's browser) or ADMIN_SECRET (scripts). */
export async function isAuthed(req: NextRequest) {
  if (isAdmin(req)) return true;
  const { accountFromRequest } = await import("./session");
  return (await accountFromRequest(req)) !== null;
}

export function isCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    bearerToken(req) === secret ||
    req.nextUrl.searchParams.get("secret") === secret
  );
}
