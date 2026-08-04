"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-sidebar text-sidebar-foreground group relative rounded-lg">
      <pre className="scrollbar-none overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre">
        {text}
      </pre>
      <button
        onClick={() =>
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
        className="text-sidebar-foreground/60 hover:text-sidebar-foreground bg-sidebar absolute top-2 right-2 rounded-md p-1.5 transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check className="size-3.5 text-[var(--color-emerald-400)]" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
