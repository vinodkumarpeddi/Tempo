"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(500px 240px at 50% 0%, color-mix(in oklch, var(--color-brand-400) 12%, transparent), transparent)",
        }}
      />
      <Link href="/" className="relative mb-8 flex items-center gap-2.5">
        <span className="bg-primary flex size-9 items-center justify-center rounded-xl">
          <Gauge className="size-5 text-white" />
        </span>
        <span className="font-semibold tracking-tight">Claude Team Usage</span>
      </Link>
      <div className="border-border bg-card relative w-full max-w-sm rounded-2xl border p-7 shadow-[0_16px_50px_-24px_rgb(0_0_0/0.25)]">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">{subtitle}</p>
        {children}
      </div>
      {footer && <div className="text-muted-foreground relative mt-5 text-sm">{footer}</div>}
    </div>
  );
}
