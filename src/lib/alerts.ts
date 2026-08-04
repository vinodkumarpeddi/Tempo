import { Prisma, Settings, User } from "@prisma/client";
import { prisma } from "./db";
import { ParsedUsage } from "./usage";
import { emailShell, fmtReset, sendEmail } from "./email";

type PrevSnapshot = {
  fiveHourPct: number;
  fiveHourResetsAt: Date;
  sevenDayPct: number;
  sevenDayResetsAt: Date;
} | null;

// Runs on every ingest: compares the new snapshot with the previous one and
// sends threshold / reset emails. AlertLog's unique constraint dedupes, so a
// re-delivered snapshot can never double-send.
export async function evaluateAlerts(
  user: User,
  prev: PrevSnapshot,
  next: ParsedUsage,
  settings: Settings,
) {
  if (!settings.alertsEnabled) return;
  const admin = settings.adminEmail ? [settings.adminEmail] : [];

  const windows = [
    {
      label: "Session (5-hour)",
      slug: "session",
      prevPct: prev?.fiveHourPct,
      pct: next.fiveHourPct,
      prevResetsAt: prev?.fiveHourResetsAt,
      resetsAt: next.fiveHourResetsAt,
      notifyReset: (prev?.fiveHourPct ?? 0) >= settings.warnThreshold,
    },
    {
      label: "Weekly",
      slug: "weekly",
      prevPct: prev?.sevenDayPct,
      pct: next.sevenDayPct,
      prevResetsAt: prev?.sevenDayResetsAt,
      resetsAt: next.sevenDayResetsAt,
      notifyReset: true,
    },
  ];

  for (const w of windows) {
    const windowKey = w.resetsAt.toISOString();

    for (const [kind, threshold] of [
      [`${w.slug}-critical`, settings.criticalThreshold],
      [`${w.slug}-warn`, settings.warnThreshold],
    ] as const) {
      if (w.pct < threshold) continue;
      if (!(await claim(user.id, kind, windowKey))) continue;
      await sendEmail(
        [user.email, ...admin],
        `Claude ${w.label.toLowerCase()} limit at ${w.pct.toFixed(0)}% — ${user.name}`,
        emailShell(
          `${w.label} limit at ${w.pct.toFixed(0)}%`,
          `<p><b>${user.name}</b> has used <b>${w.pct.toFixed(0)}%</b> of the ${w.label.toLowerCase()} limit.</p>
           <p>Resets in ${fmtReset(w.resetsAt)}.</p>`,
        ),
      );
      break; // send only the highest crossed threshold per window
    }

    const rolled =
      w.prevResetsAt &&
      w.resetsAt.getTime() > w.prevResetsAt.getTime() + 60_000;
    if (rolled && w.notifyReset) {
      if (await claim(user.id, `${w.slug}-reset`, windowKey)) {
        await sendEmail(
          [user.email],
          `Your Claude ${w.label.toLowerCase()} limit has reset`,
          emailShell(
            `${w.label} limit reset`,
            `<p>Your ${w.label.toLowerCase()} limit has reset — you're back to <b>${w.pct.toFixed(0)}%</b> used.</p>
             <p>This window runs until ${fmtReset(w.resetsAt)}.</p>`,
          ),
        );
      }
    }
  }
}

async function claim(userId: string, kind: string, dedupeKey: string) {
  try {
    await prisma.alertLog.create({ data: { userId, kind, dedupeKey } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return false;
    throw e;
  }
}
