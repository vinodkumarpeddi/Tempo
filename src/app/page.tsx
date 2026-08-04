import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Gauge,
  Lock,
  Mail,
  TimerReset,
} from "lucide-react";
import { getSessionAccount } from "@/lib/session";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Gauge,
    title: "Live limit meters",
    text: "Session (5-hour) and weekly utilization for every member, with reset countdowns and exact reset dates.",
  },
  {
    icon: Lock,
    title: "Tokens stay local",
    text: "A tiny collector on each machine reads the Claude Code token locally and reports only percentages.",
  },
  {
    icon: Mail,
    title: "Daily email reports",
    text: "A team digest every day at the hour you choose — inline table or PDF attachment, powered by Resend.",
  },
  {
    icon: BellRing,
    title: "Threshold & reset alerts",
    text: "Members get warned at 80% and 95%, and notified the moment a weekly window resets.",
  },
];

const MOCK = [
  { name: "Arjun", initial: "A", session: 97, weekly: 86 },
  { name: "Priya", initial: "P", session: 62, weekly: 41 },
  { name: "Vinod", initial: "V", session: 14, weekly: 5 },
];

function barColor(pct: number) {
  if (pct >= 95) return "var(--color-rose-500)";
  if (pct >= 80) return "var(--color-amber-500)";
  return "var(--color-emerald-500)";
}

export default async function LandingPage() {
  const account = await getSessionAccount();
  if (account) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-sm font-semibold tracking-tight">Brimly</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground hover:bg-brand-700 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(600px 280px at 50% -40px, color-mix(in oklch, #7048E8 13%, transparent), transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(640px 420px at 50% 0%, black, transparent)",
            }}
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 pt-20 pb-16 text-center">
            <div className="border-border bg-card text-muted-foreground mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium">
              <span className="bg-[var(--color-emerald-500)] size-1.5 rounded-full" />
              Session &amp; weekly limits, tracked live
            </div>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tighter text-balance sm:text-6xl">
              Know your team&apos;s Claude limits{" "}
              <span className="bg-gradient-to-r from-[#8B6BF2] to-[#5F3DC4] bg-clip-text text-transparent">
                before they hit them
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg text-balance">
              One dashboard for every member&apos;s session and weekly usage, reset dates,
              daily email reports, and limit alerts.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/signup"
                className="bg-primary text-primary-foreground hover:bg-brand-700 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
              >
                Get started
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/setup"
                className="border-border bg-card hover:bg-accent inline-flex items-center rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
              >
                How it works
              </Link>
            </div>

            <div className="border-border bg-card mx-auto mt-14 max-w-4xl rounded-2xl border p-2 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.25)]">
              <div className="bg-sidebar flex items-center gap-1.5 rounded-t-xl px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                <span className="size-2.5 rounded-full bg-[#febc2e]" />
                <span className="size-2.5 rounded-full bg-[#28c840]" />
                <span className="text-sidebar-foreground/50 ms-3 text-[11px]">
                  brimly — dashboard
                </span>
              </div>
              <div className="bg-background grid gap-3 rounded-b-xl p-4 text-start sm:grid-cols-3">
                {MOCK.map((m) => (
                  <div key={m.name} className="border-border bg-card rounded-xl border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-secondary text-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                        {m.initial}
                      </span>
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                    {(
                      [
                        ["Session", m.session],
                        ["Weekly", m.weekly],
                      ] as const
                    ).map(([label, pct]) => (
                      <div key={label} className="mb-2.5 last:mb-0">
                        <div className="mb-1 flex justify-between text-[10px]">
                          <span className="text-muted-foreground font-medium tracking-wider uppercase">
                            {label}
                          </span>
                          <span className="font-semibold tabular-nums">{pct}%</span>
                        </div>
                        <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: barColor(pct) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-border/60 border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="border-border bg-card rounded-xl border p-5">
                <span className="border-border bg-secondary/60 text-foreground mb-3 flex size-9 items-center justify-center rounded-lg border">
                  <f.icon className="size-4.5" />
                </span>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-border/60 border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Running in three steps
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Gauge,
                  step: "01",
                  title: "Create the admin account",
                  text: "One login owns the workspace — dashboards, members, and settings are only visible to you.",
                },
                {
                  icon: TimerReset,
                  step: "02",
                  title: "Install the collector",
                  text: "Each member runs a one-line installer. It reports usage on the interval you configure.",
                },
                {
                  icon: CalendarClock,
                  step: "03",
                  title: "Watch limits & get reports",
                  text: "Live meters with reset dates, a daily digest by email, and alerts before anyone hits a wall.",
                },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="text-muted-foreground/60 text-xs font-semibold tracking-widest">
                    {s.step}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm leading-relaxed">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-xs">
          <span className="flex items-center gap-2">
            <Logo className="size-5" rounded="rounded-md" />
            Brimly — Claude usage for teams
          </span>
          <span>Self-hosted · your data stays yours</span>
        </div>
      </footer>
    </div>
  );
}
