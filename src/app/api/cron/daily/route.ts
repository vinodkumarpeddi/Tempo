import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSettings, prisma, scopedByUser } from "@/lib/db";
import { isAuthed, isCron } from "@/lib/auth";
import { Attachment, barCell, emailShell, fmtReset, sendEmail } from "@/lib/email";
import { buildUsagePdf } from "@/lib/pdf";
import { ScopedLimit } from "@/lib/usage";
import { IST_OFFSET_MS } from "@/lib/ist";

export const dynamic = "force-dynamic";

// Safe to call every few minutes (cron-job.org or Vercel Cron): each
// configured slot sends at most once per day. Schedule semantics are IST
// (UTC+5:30, no DST) — days, times, and the sent-log all use the IST
// calendar. `?force=1` bypasses the checks for testing.
export async function GET(req: NextRequest) {
  if (!isCron(req) && !(await isAuthed(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const force = req.nextUrl.searchParams.get("force") === "1";

  const settings = await getSettings();

  // Housekeeping on every cron tick: usage history older than 90 days is noise.
  await prisma.snapshot.deleteMany({
    where: { capturedAt: { lt: new Date(Date.now() - 90 * 86_400_000) } },
  });
  if (!settings.digestEnabled && !force) {
    return NextResponse.json({ sent: false, reason: "digest disabled" });
  }

  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const todayIst = ist.toISOString().slice(0, 10);
  let dueSlot: string | null = null;
  if (!force) {
    const days = settings.digestDays
      .split(",")
      .map((d) => parseInt(d, 10))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (!days.includes(ist.getUTCDay())) {
      return NextResponse.json({ sent: false, reason: "not a configured report day" });
    }
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    const times = settings.digestTimes.split(",").filter((t) => timeRe.test(t));
    const nowMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    let sentToday: string[] = [];
    try {
      const log = JSON.parse(settings.digestSentLog || "[]") as string[];
      sentToday = log.filter((k) => k.startsWith(todayIst));
    } catch {}
    // A slot is due once its time has passed and it hasn't been sent today —
    // so a briefly-down server still catches up on the next cron tick.
    const due = times.find((t) => {
      const [h, m] = t.split(":").map(Number);
      return nowMinutes >= h * 60 + m && !sentToday.includes(`${todayIst}#${t}`);
    });
    if (!due) {
      return NextResponse.json({ sent: false, reason: "no report slot due" });
    }
    dueSlot = `${todayIst}#${due}`;
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: {
          fiveHourPct: true,
          fiveHourResetsAt: true,
          sevenDayPct: true,
          sevenDayResetsAt: true,
          capturedAt: true,
        },
      },
    },
  });

  if (users.length === 0) {
    return NextResponse.json({ sent: false, reason: "no members" });
  }

  const scopedFor = await scopedByUser(users.map((u) => u.id));

  const today = todayIst;

  let attachments: Attachment[] | undefined;
  let body: string;

  if (settings.digestFormat === "pdf") {
    const pdf = await buildUsagePdf(
      users.map((u) => {
        const s = u.snapshots[0] ?? null;
        return {
          name: u.name,
          email: u.email,
          fiveHourPct: s?.fiveHourPct ?? null,
          fiveHourResetsAt: s?.fiveHourResetsAt ?? null,
          sevenDayPct: s?.sevenDayPct ?? null,
          sevenDayResetsAt: s?.sevenDayResetsAt ?? null,
          scoped: scopedFor.get(u.id) ?? [],
        };
      }),
      { date: today, warn: settings.warnThreshold, critical: settings.criticalThreshold },
    );
    attachments = [
      { filename: `claude-usage-${today}.pdf`, content: Buffer.from(pdf) },
    ];
    body = `<p>Today's team usage report is attached as a PDF.</p>`;
  } else {
    body = inlineTable(users, settings, scopedFor);
  }

  const staleMs = Math.max(2 * settings.collectIntervalMin, 60) * 60_000;
  const staleMembers = users.filter((u) => {
    const s = u.snapshots[0];
    return !s || now.getTime() - s.capturedAt.getTime() > staleMs;
  });
  if (staleMembers.length > 0) {
    body += `<p style="margin-top:16px;padding:10px 14px;background:#fef3c7;border-radius:8px;color:#92400e;">
      <b>Not reporting:</b> ${staleMembers.map((u) => u.name).join(", ")} —
      no recent data from these machines (collector off or laptop asleep).</p>`;
  }

  const html = emailShell(`Claude usage — daily report`, body);

  const recipients =
    settings.digestAudience === "admin"
      ? settings.adminEmail
        ? [settings.adminEmail]
        : []
      : [
          ...new Set([
            ...users.map((u) => u.email),
            ...(settings.adminEmail ? [settings.adminEmail] : []),
          ]),
        ];

  if (recipients.length === 0) {
    return NextResponse.json({
      sent: false,
      reason: "audience is admin-only but no admin email is set",
    });
  }

  const sent = await sendEmail(
    recipients,
    `Claude usage report — ${today}`,
    html,
    attachments,
  );

  if (sent) {
    let log: string[] = [];
    try {
      log = JSON.parse(settings.digestSentLog || "[]") as string[];
    } catch {}
    const nextLog = [...log.filter((k) => k.startsWith(todayIst)), ...(dueSlot ? [dueSlot] : [])];
    await prisma.settings.update({
      where: { id: 1 },
      data: { lastDigestAt: now, digestSentLog: JSON.stringify(nextLog) },
    });
  }

  return NextResponse.json({ sent, recipients: recipients.length });
}

type UserWithSnapshot = Prisma.UserGetPayload<{
  include: {
    snapshots: {
      select: {
        fiveHourPct: true;
        fiveHourResetsAt: true;
        sevenDayPct: true;
        sevenDayResetsAt: true;
        capturedAt: true;
      };
    };
  };
}>;

type DigestSettings = {
  warnThreshold: number;
  criticalThreshold: number;
};

function inlineTable(
  users: UserWithSnapshot[],
  settings: DigestSettings,
  scopedFor: Map<string, ScopedLimit[]>,
) {
  const rows = users
    .map((u) => {
      const s = u.snapshots[0];
      if (!s) {
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;"><b>${u.name}</b></td>
          <td colspan="3" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;">no data reported yet</td>
        </tr>`;
      }
      const scoped = scopedFor.get(u.id) ?? [];
      const scopedCell = scoped.length
        ? scoped
            .map(
              (l) => `${barCell(l.pct, settings.warnThreshold, settings.criticalThreshold)}<br/>
          <span style="font-size:12px;color:#6b7280;">${l.label} &middot; ${l.resetsAt ? `resets ${fmtReset(new Date(l.resetsAt))}` : "not used yet this week"}</span>`,
            )
            .join("<br/>")
        : `<span style="color:#6b7280;">&mdash;</span>`;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;"><b>${u.name}</b></td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          ${barCell(s.fiveHourPct, settings.warnThreshold, settings.criticalThreshold)}<br/>
          <span style="font-size:12px;color:#6b7280;">session &middot; resets ${fmtReset(s.fiveHourResetsAt)}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          ${barCell(s.sevenDayPct, settings.warnThreshold, settings.criticalThreshold)}<br/>
          <span style="font-size:12px;color:#6b7280;">weekly &middot; resets ${fmtReset(s.sevenDayResetsAt)}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          ${scopedCell}
        </td>
      </tr>`;
    })
    .join("");

  return `<table style="border-collapse:collapse;width:100%;">
       <tr>
         <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Member</th>
         <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Session (5h)</th>
         <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Weekly</th>
         <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #d1d5db;">Model caps</th>
       </tr>
       ${rows}
     </table>`;
}
