"use client";

import { useState } from "react";

/**
 * Copy-link + print actions for the current tool. With real routes (and the
 * query-state some tools write), the current URL is a shareable, reproducible
 * link; Print uses the browser's print/Save-as-PDF via a print stylesheet.
 */
export default function ShareBar() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={copy}
        className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Print
      </button>
    </div>
  );
}
