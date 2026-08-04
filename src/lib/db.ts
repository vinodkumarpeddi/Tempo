import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  if (!settings.teamKey) {
    return prisma.settings.update({
      where: { id: 1 },
      data: { teamKey: "ctu_team_" + randomBytes(24).toString("hex") },
    });
  }
  return settings;
}
