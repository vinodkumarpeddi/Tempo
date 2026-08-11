"use client";

import { DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

export default function ServiceDown({
  title = "Can't reach the database",
  detail = "Brimly is running, but its database isn't answering. Usage already collected is safe — the dashboard will fill back in once the connection returns.",
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="size-9" />
      <span className="border-border bg-card text-muted-foreground mt-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium">
        <DatabaseZap className="size-3.5" />
        Service degraded
      </span>
      <h1 className="mt-5 max-w-lg text-2xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed text-balance">
        {detail}
      </p>
      <Button
        className="mt-7"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
      >
        Try again
      </Button>
    </div>
  );
}
