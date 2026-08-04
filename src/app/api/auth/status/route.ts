import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.adminAccount.count();
  return NextResponse.json({ hasAccount: count > 0 });
}
