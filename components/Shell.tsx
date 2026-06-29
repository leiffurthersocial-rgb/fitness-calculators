"use client";

import { useState } from "react";
import Link from "next/link";
import { TOOL_GROUPS, findTool, ALL_TOOLS } from "@/lib/tools";
import { getToolContent } from "@/lib/toolContent";
import { useTheme } from "@/lib/theme";
import { useUnits } from "@/lib/settings";
import { SegmentedControl } from "@/components/ui";
import ProfilePanel from "@/components/ProfilePanel";
import Sources from "@/components/Sources";
import Faq from "@/components/Faq";
import ShareBar from "@/components/ShareBar";
import type { UnitSystem } from "@/lib/units";

const href = (id: string) => `/t/${id}`;

export default function Shell({ activeId }: { activeId: string }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { theme, toggle } = useTheme();
  const { units, setUnits } = useUnits();

  const active = findTool(activeId) ?? ALL_TOOLS[0];
  const ActiveComponent = active.Component;
  const activeGroup = TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === active.id));
  const content = getToolContent(active.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="hidden w-72 shrink-0 flex-col gap-5 border-r border-zinc-200 p-5 dark:border-zinc-800 lg:flex print:hidden">
        <Brand theme={theme} onToggleTheme={toggle} />
        <UnitsToggle units={units} setUnits={setUnits} />
        <ProfilePanel />
        <NavList activeId={active.id} query={query} setQuery={setQuery} />
        <Footer />
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:hidden print:hidden">
        <Brand theme={theme} onToggleTheme={toggle} compact />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          {mobileNavOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* ---- Mobile slide-down nav ---- */}
      {mobileNavOpen && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden print:hidden">
          <UnitsToggle units={units} setUnits={setUnits} />
          <div className="mt-4">
            <ProfilePanel />
          </div>
          <div className="mt-4">
            <NavList
              activeId={active.id}
              query={query}
              setQuery={setQuery}
              onPick={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ---- Main content ---- */}
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-accent-600 dark:text-accent-400">
              {activeGroup?.emoji} {activeGroup?.group}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{active.name}</h1>
            <p className="text-sm text-zinc-500">{active.blurb}</p>
          </div>
          <ShareBar />
        </div>
        <ActiveComponent />
        <Sources items={content.sources} />
        <Faq items={content.faq} />
      </main>
    </div>
  );
}

function UnitsToggle({
  units,
  setUnits,
}: {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <span className="text-xs font-medium text-zinc-500">Units</span>
      <SegmentedControl
        value={units}
        onChange={setUnits}
        options={[
          { value: "metric", label: "Metric" },
          { value: "imperial", label: "Imperial" },
        ]}
      />
    </div>
  );
}

function NavList({
  activeId,
  query,
  setQuery,
  onPick,
}: {
  activeId: string;
  query: string;
  setQuery: (q: string) => void;
  onPick?: () => void;
}) {
  const norm = (s: string) => s.normalize("NFKD").toLowerCase();
  const q = norm(query.trim());
  const filteredGroups = TOOL_GROUPS.map((g) => ({
    ...g,
    tools: q
      ? g.tools.filter((t) => norm(t.name).includes(q) || norm(t.blurb).includes(q))
      : g.tools,
  })).filter((g) => g.tools.length > 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          className="w-full rounded-xl border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
          🔍
        </span>
      </div>

      <nav className="space-y-5">
        {filteredGroups.length === 0 && (
          <p className="px-2 text-sm text-zinc-400">No tools match “{query}”.</p>
        )}
        {filteredGroups.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span>{g.emoji}</span>
              {g.group}
            </div>
            <div className="space-y-0.5">
              {g.tools.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <Link
                    key={t.id}
                    href={href(t.id)}
                    onClick={onPick}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "block w-full rounded-xl px-3 py-2 text-left text-sm transition " +
                      (isActive
                        ? "bg-accent-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800")
                    }
                  >
                    {t.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
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
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-lg font-black text-white">
          V
        </div>
        {!compact && (
          <div>
            <div className="text-lg font-bold leading-none">Vital</div>
            <div className="text-xs text-zinc-400">Health &amp; fitness hub</div>
          </div>
        )}
      </Link>
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
      Estimates for general guidance only — not medical advice. All data stays in
      your browser.
    </p>
  );
}
