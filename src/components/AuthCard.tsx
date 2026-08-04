"use client";

import Link from "next/link";
import { BellRing, CalendarClock, Gauge, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: Gauge, text: "Live session and weekly meters for every member" },
  { icon: CalendarClock, text: "Reset countdowns with exact dates, always visible" },
  { icon: BellRing, text: "Daily email reports and threshold alerts" },
  { icon: ShieldCheck, text: "Tokens never leave member machines — only percentages" },
];

function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="bg-sidebar-primary flex size-8 items-center justify-center rounded-lg">
        <Gauge className="size-4.5 text-white" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Claude Team Usage</span>
    </Link>
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
      <aside className="bg-sidebar text-sidebar-foreground hidden w-[44%] max-w-xl flex-col justify-between p-10 lg:flex">
        <Brand />
        <div>
          <h2 className="max-w-sm text-2xl font-semibold tracking-tight text-balance">
            Know who has Claude capacity before work stalls.
          </h2>
          <ul className="mt-9 space-y-4">
            {POINTS.map((p) => (
              <li
                key={p.text}
                className="text-sidebar-foreground/75 flex items-start gap-3 text-sm leading-relaxed"
              >
                <p.icon className="text-sidebar-primary mt-0.5 size-4 shrink-0" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sidebar-foreground/45 text-xs">
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
