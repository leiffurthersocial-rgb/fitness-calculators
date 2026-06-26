"use client";

import { useState } from "react";
import { TOOL_GROUPS, findTool, ALL_TOOLS } from "@/lib/tools";
import ProfilePanel from "@/components/ProfilePanel";
import { useTheme } from "@/lib/theme";

export default function Home() {
  const [activeId, setActiveId] = useState(ALL_TOOLS[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const active = findTool(activeId)!;
  const ActiveComponent = active.Component;
  const activeGroup = TOOL_GROUPS.find((g) =>
    g.tools.some((t) => t.id === activeId)
  );

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <nav className="space-y-5">
      {TOOL_GROUPS.map((g) => (
        <div key={g.group}>
          <div className="mb-1.5 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <span>{g.emoji}</span>
            {g.group}
          </div>
          <div className="space-y-0.5">
            {g.tools.map((t) => {
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveId(t.id);
                    onPick?.();
                  }}
                  className={
                    "w-full rounded-xl px-3 py-2 text-left text-sm transition " +
                    (isActive
                      ? "bg-accent-600 text-white shadow-sm"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800")
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="hidden w-72 shrink-0 flex-col gap-5 border-r border-zinc-200 p-5 dark:border-zinc-800 lg:flex">
        <Brand theme={theme} onToggleTheme={toggle} />
        <ProfilePanel />
        <NavList />
        <Footer />
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:hidden">
        <Brand theme={theme} onToggleTheme={toggle} compact />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          {mobileNavOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* ---- Mobile slide-down nav ---- */}
      {mobileNavOpen && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <ProfilePanel />
          <div className="mt-4">
            <NavList onPick={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* ---- Main content ---- */}
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <div className="mb-6">
          <div className="text-sm font-medium text-accent-600 dark:text-accent-400">
            {activeGroup?.emoji} {activeGroup?.group}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{active.name}</h1>
          <p className="text-sm text-zinc-500">{active.blurb}</p>
        </div>
        <ActiveComponent />
      </main>
    </div>
  );
}

function Brand({
  theme,
  onToggleTheme,
  compact,
}: {
  theme: string;
  onToggleTheme: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-lg font-black text-white">
          V
        </div>
        {!compact && (
          <div>
            <div className="text-lg font-bold leading-none">Vital</div>
            <div className="text-xs text-zinc-400">Health &amp; fitness hub</div>
          </div>
        )}
      </div>
      <button
        onClick={onToggleTheme}
        className="rounded-xl border border-zinc-300 p-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label="Toggle theme"
        title="Toggle light / dark"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

function Footer() {
  return (
    <p className="mt-auto pt-4 text-xs leading-relaxed text-zinc-400">
      Estimates for general guidance only — not medical advice. All data stays
      in your browser.
    </p>
  );
}
