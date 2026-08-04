"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: ["/dashboard", "/member"] },
  { href: "/members", label: "Members", icon: Users, match: ["/members"] },
  { href: "/alerts", label: "Alerts", icon: BellRing, match: ["/alerts"] },
  { href: "/settings", label: "Settings", icon: Settings, match: ["/settings"] },
  { href: "/setup", label: "Setup guide", icon: BookOpen, match: ["/setup"] },
];

export default function AppShell({
  account,
  children,
}: {
  account: { name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="bg-sidebar flex min-h-dvh">
      <aside className="text-sidebar-foreground sticky top-0 flex h-dvh w-60 shrink-0 flex-col px-3 py-4 max-md:hidden">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
          <Logo className="size-8" />
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">Tempo</span>
            <span className="text-sidebar-foreground/55 block text-[10px] font-medium tracking-wider uppercase">
              Claude usage
            </span>
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          <div className="text-sidebar-foreground/50 mb-1 px-2.5 text-[10px] font-semibold tracking-widest uppercase">
            Workspace
          </div>
          {NAV.map((item) => {
            const active = item.match.some((m) => pathname.startsWith(m));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <div className="border-sidebar-border flex items-center gap-2.5 border-t px-2.5 pt-3">
            <MonogramAvatar name={account.name} colorful className="size-8 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{account.name}</div>
              <div className="text-sidebar-foreground/60 truncate text-[11px]">{account.email}</div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded-md p-1.5 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 py-3 pe-3 max-md:ps-3">
        <div className="bg-background border-border/40 min-h-full rounded-[14px] border">
          {children}
        </div>
      </div>
    </div>
  );
}
