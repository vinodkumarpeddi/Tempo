import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claude Team Usage",
  description: "Session and weekly limit tracking for your team's Claude accounts",
};

const darkModeScript = `
try {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-sidebar">
        <header className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Claude <span className="text-sidebar-primary">Team Usage</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="text-sidebar-foreground/80 hover:text-sidebar-foreground">
                Team
              </Link>
              <Link href="/admin" className="text-sidebar-foreground/80 hover:text-sidebar-foreground">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <div className="bg-background border-border/40 mx-3 mb-3 flex-1 rounded-[14px] border">
          {children}
        </div>
      </body>
    </html>
  );
}
