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

/**
 * Resolve the reporting member: either a personal ingest key, or the shared
 * team key plus the member's Claude account email (sent by the collector).
 * With the team key, unknown members are auto-created on ingest so one
 * command works for the whole team.
 */
export async function resolveCollectorUser(req: NextRequest, opts: { autoCreate: boolean }) {
  const key = bearerToken(req);
  if (!key) return { user: null, teamAuthed: false, blocked: false };

  const direct = await prisma.user.findUnique({ where: { ingestKey: key } });
  if (direct) return { user: direct, teamAuthed: false, blocked: false };

  const { getSettings } = await import("./db");
  const settings = await getSettings();
  if (!settings.teamKey || key !== settings.teamKey) {
    return { user: null, teamAuthed: false, blocked: false };
  }

  const email = (req.headers.get("x-member-email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { user: null, teamAuthed: true, blocked: false };

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Removed members must not silently resurrect via the team key.
    const blocked = await prisma.blockedEmail.findUnique({ where: { email } });
    if (blocked) return { user: null, teamAuthed: true, blocked: true };
    if (opts.autoCreate) {
      const rawName = (req.headers.get("x-member-name") ?? "").trim();
      const name = rawName || email.split("@")[0];
      user = await prisma.user.create({
        data: { name, email, ingestKey: newIngestKey() },
      });
    }
  }
  return { user, teamAuthed: true, blocked: false };
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
