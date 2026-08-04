import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";

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

// Light by default (the EverHr frame: dark slate chrome around a light
// content surface); dark only when the user toggled it.
const themeScript = `
try {
  if (localStorage.getItem("theme") === "dark")
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-sidebar flex min-h-full flex-col">
        <TopNav />
        <div className="bg-background border-border/40 mx-3 mb-3 flex-1 rounded-[14px] border">
          {children}
        </div>
      </body>
    </html>
  );
}
