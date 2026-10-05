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
    <div className="flex shrink-0 items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={copy}
        className="neu-btn rounded-xl px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="neu-btn rounded-xl px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
      >
        Print
      </button>
    </div>
  );
}
