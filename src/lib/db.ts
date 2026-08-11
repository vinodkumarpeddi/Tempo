import { randomBytes } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { scopedLimits, ScopedLimit } from "./usage";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Model-scoped caps live only inside each snapshot's `raw` payload, which is
 * orders of magnitude larger than the columns the dashboard actually renders.
 * Reading `raw` for a page of history per member — on a view that polls — is
 * what exhausted the database's data-transfer quota, so pull exactly one row
 * per member: the newest snapshot whose payload can carry scoped caps at all.
 */
export async function scopedByUser(
  userIds: string[],
): Promise<Map<string, ScopedLimit[]>> {
  const out = new Map<string, ScopedLimit[]>();
  if (userIds.length === 0) return out;

  const rows = await prisma.$queryRaw<{ userId: string; raw: string }[]>`
    SELECT "userId", "raw" FROM (
      SELECT "userId", "raw",
             row_number() OVER (PARTITION BY "userId" ORDER BY "capturedAt" DESC) AS rn
      FROM "Snapshot"
      WHERE "userId" IN (${Prisma.join(userIds)})
        AND "raw" LIKE '%weekly_scoped%'
    ) newest WHERE newest.rn = 1
  `;

  for (const row of rows) {
    const limits = scopedLimits(row.raw);
    if (limits.length > 0) out.set(row.userId, limits);
  }
  return out;
}

export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const data: { teamKey?: string; joinCode?: string } = {};
  if (!settings.teamKey) data.teamKey = "ctu_team_" + randomBytes(24).toString("hex");
  if (!settings.joinCode) data.joinCode = randomBytes(6).toString("base64url");
  if (Object.keys(data).length > 0) {
    return prisma.settings.update({ where: { id: 1 }, data });
  }
  return settings;
}
