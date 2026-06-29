"use client";

import { useEffect, useState } from "react";
import { TOOL_GROUPS, findTool, ALL_TOOLS } from "@/lib/tools";
import { useTheme } from "@/lib/theme";
import { useUnits } from "@/lib/settings";
import { SegmentedControl } from "@/components/ui";
import ProfilePanel from "@/components/ProfilePanel";
import type { UnitSystem } from "@/lib/units";

export default function Home() {
  const [activeId, setActiveId] = useState(ALL_TOOLS[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { theme, toggle } = useTheme();
  const { units, setUnits } = useUnits();

  // Deep-link the active tool via the URL hash so refresh, bookmarks,
  // browser back/forward and shared links all land on the right calculator.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (id && findTool(id)) setActiveId(id);
      else if (!id) setActiveId(ALL_TOOLS[0].id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  // Keep the URL hash, page title and scroll position in sync with the
  // active tool whenever it changes.
  const selectTool = (id: string) => {
    setActiveId(id);
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `#${id}`);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  // Reflect the active tool in the tab title on in-app navigation. (A hard
  // deep-link load keeps the static branded title from metadata, which React
  // owns during hydration — still a valid title, so no special-casing needed.)
  useEffect(() => {
    const tool = findTool(activeId);
    if (tool) document.title = `${tool.name} — Vital`;
  }, [activeId]);

  const active = findTool(activeId)!;
  const ActiveComponent = active.Component;
  const activeGroup = TOOL_GROUPS.find((g) =>
    g.tools.some((t) => t.id === activeId)
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="hidden w-72 shrink-0 flex-col gap-5 border-r border-zinc-200 p-5 dark:border-zinc-800 lg:flex">
        <Brand theme={theme} onToggleTheme={toggle} />
        <UnitsToggle units={units} setUnits={setUnits} />
        <ProfilePanel />
        <NavList
          activeId={activeId}
          query={query}
          setQuery={setQuery}
          onSelect={selectTool}
        />
        <Footer />
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:hidden">
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
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <UnitsToggle units={units} setUnits={setUnits} />
          <div className="mt-4">
            <ProfilePanel />
          </div>
          <div className="mt-4">
            <NavList
              activeId={activeId}
              query={query}
              setQuery={setQuery}
              onSelect={(id) => {
                selectTool(id);
                setMobileNavOpen(false);
              }}
            />
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
  onSelect,
}: {
  activeId: string;
  query: string;
  setQuery: (q: string) => void;
  onSelect: (id: string) => void;
}) {
  // NFKD-normalise so a plain-ASCII query matches names with typographic
  // characters — e.g. "vo2" finds "VO₂ max" (subscript two decomposes to "2").
  const norm = (s: string) => s.normalize("NFKD").toLowerCase();
  const q = norm(query.trim());
  const filteredGroups = TOOL_GROUPS.map((g) => ({
    ...g,
    tools: q
      ? g.tools.filter(
          (t) => norm(t.name).includes(q) || norm(t.blurb).includes(q)
        )
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
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    aria-current={isActive ? "page" : undefined}
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
