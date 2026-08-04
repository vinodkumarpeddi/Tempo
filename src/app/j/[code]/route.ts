import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

// Short join URL: serves the installer with the server address and team key
// baked in, so onboarding is `curl -sSL https://server/j/<code> | bash`.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const settings = await getSettings();

  if (!settings.joinCode || code !== settings.joinCode) {
    return new NextResponse("not found\n", { status: 404 });
  }

  const origin = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.nextUrl.origin;

  const script = `#!/bin/bash
# Tempo collector bootstrap — fetches the installer with this workspace's
# server address and team key baked in.
set -eu
curl -sSL "${origin}/install.sh" | bash -s -- "${origin}" "${settings.teamKey}"
`;

  return new NextResponse(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
