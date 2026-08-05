import { Resend } from "resend";
import nodemailer from "nodemailer";
import { fmtIst } from "./ist";

const from = () => process.env.EMAIL_FROM ?? "Tempo <onboarding@resend.dev>";

export type Attachment = { filename: string; content: Buffer };

// SMTP (e.g. Gmail with an app password) wins when configured — it can send
// to any recipient without a verified domain. Falls back to Resend.
function smtpTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? "465") === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  attachments?: Attachment[],
) {
  if (to.length === 0) {
    console.log(`[email skipped] ${subject} -> (nobody)`);
    return false;
  }

  const smtp = smtpTransport();
  if (smtp) {
    try {
      await smtp.sendMail({
        from: from(),
        to: to.join(", "),
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });
      return true;
    } catch (e) {
      console.error(`[email failed via smtp] ${subject}:`, e);
      return false;
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email skipped] ${subject} -> ${to.join(", ")}`);
    return false;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: from(),
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content.toString("base64"),
    })),
  });
  if (error) {
    console.error(`[email failed] ${subject}:`, error);
    return false;
  }
  return true;
}

export function fmtReset(d: Date) {
  const mins = Math.max(0, Math.round((d.getTime() - Date.now()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const rel = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return `${rel} (${fmtIst(d)})`;
}

export function barCell(pct: number, warn: number, critical: number) {
  const color = pct >= critical ? "#dc2626" : pct >= warn ? "#d97706" : "#16a34a";
  const width = Math.min(100, Math.max(0, Math.round(pct)));
  return `
    <div style="background:#e5e7eb;border-radius:4px;width:160px;height:12px;display:inline-block;vertical-align:middle;">
      <div style="background:${color};width:${width}%;height:12px;border-radius:4px;"></div>
    </div>
    <span style="margin-left:8px;font-weight:600;color:${color};">${pct.toFixed(0)}%</span>`;
}

export function emailShell(title: string, body: string) {
  const appUrl = process.env.APP_URL ?? "";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827;">
    <h2 style="margin:0 0 16px;">${title}</h2>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#6b7280;">
      Sent by claude-team-usage${appUrl ? ` &middot; <a href="${appUrl}">dashboard</a>` : ""}
    </p>
  </div>`;
}
