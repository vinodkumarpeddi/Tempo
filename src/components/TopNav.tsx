"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Team" },
  { href: "/admin", label: "Admin" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }, []);

  return (
    <header className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-sidebar-primary flex size-7 items-center justify-center rounded-lg">
            <Gauge className="size-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Claude Team Usage</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" || pathname.startsWith("/member") : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground ms-2 rounded-md p-1.5 transition-colors"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
