"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

// Ultra-minimal centered auth (the Vercel pattern): mark, one line, the form,
// nothing else competing for attention.
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
    <div className="bg-background relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(480px 320px at 50% 30%, black, transparent)",
        }}
      />
      <div className="relative w-full max-w-[350px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Logo className="size-11" rounded="rounded-xl" />
          </Link>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
        </div>
        {children}
        {footer && (
          <div className="text-muted-foreground mt-8 text-center text-sm">{footer}</div>
        )}
      </div>
      <p className="text-muted-foreground/60 absolute bottom-6 text-xs">
        Tempo — Claude usage for teams · self-hosted
      </p>
    </div>
  );
}
