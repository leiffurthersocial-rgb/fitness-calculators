"use client";

import { useTheme } from "@/lib/theme";

/** Standalone light/dark toggle for pages outside the app Shell (e.g. landing). */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-xl border border-zinc-300 p-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label="Toggle theme"
      title="Toggle light / dark"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
