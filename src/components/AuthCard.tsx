"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

const POINTS = [
  "Live capacity meters with reset dates for every member",
  "Daily reports and threshold alerts by email",
  "Tokens never leave member machines — only percentages",
];

function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <Logo className="size-8" />
      <span className="text-sm font-semibold tracking-tight">Headroom</span>
    </Link>
  );
}

function PreviewCard() {
  return (
    <div className="border-sidebar-border bg-sidebar-accent/40 mt-10 w-full max-w-xs rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="bg-sidebar-accent flex size-7 items-center justify-center rounded-full text-[10px] font-semibold">
            V
          </span>
          <span className="text-sm font-medium">Vinod</span>
        </div>
        <span className="border-sidebar-border inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-[var(--color-emerald-500)]" />
          93% left
        </span>
      </div>
      <div className="mt-4 space-y-3.5">
        {(
          [
            ["Session", 24],
            ["Weekly", 7],
          ] as const
        ).map(([label, pct]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-[10px]">
              <span className="text-sidebar-foreground/60 font-medium tracking-wider uppercase">
                {label}
              </span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className="bg-sidebar-accent h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--color-emerald-500)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar text-sidebar-foreground relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 340px at 88% 12%, color-mix(in oklch, var(--color-brand-500) 20%, transparent), transparent), radial-gradient(460px 340px at 8% 92%, color-mix(in oklch, var(--color-brand-700) 22%, transparent), transparent)",
          }}
        />
        <Brand className="relative" />
        <div className="relative">
          <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-balance">
            Know who has Claude capacity before work stalls.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li
                key={p}
                className="text-sidebar-foreground/75 flex items-start gap-3 text-sm leading-relaxed"
              >
                <span className="bg-sidebar-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                {p}
              </li>
            ))}
          </ul>
          <PreviewCard />
        </div>
        <p className="text-sidebar-foreground/45 relative text-xs">
          Self-hosted &middot; your usage data stays on your server
        </p>
      </aside>

      <main className="bg-background relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="absolute top-8 lg:hidden">
          <Brand />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1.5 mb-7 text-sm">{subtitle}</p>
          {children}
          {footer && <div className="text-muted-foreground mt-7 text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
