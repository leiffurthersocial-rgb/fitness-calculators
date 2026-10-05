"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
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

/**
 * The whole app runs on one page with client-side tool switching — clicking a
 * tool never triggers a cross-page navigation that could fail. The URL is kept
 * in sync (/t/<id>) via replaceState only, so links and refresh still work and
 * each tool has its own server-rendered route for SEO, but day-to-day use never
 * depends on it.
 */
function idFromLocation(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const m = window.location.pathname.match(/\/t\/([^/?#]+)/);
  if (m && findTool(m[1])) return m[1];
  const hash = window.location.hash.replace(/^#/, "");
  if (hash && findTool(hash)) return hash;
  return fallback;
}

export default function Shell({ initialId }: { initialId: string }) {
  const [activeId, setActiveId] = useState(initialId);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { theme, toggle } = useTheme();
  const { units, setUnits } = useUnits();

  // On mount, reconcile with the real URL (covers legacy #hash links too).
  useEffect(() => {
    const id = idFromLocation(initialId);
    if (id !== activeId) setActiveId(id);
    const onPop = () => setActiveId(idFromLocation(initialId));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "/" jumps to tool search (opening the mobile menu if the sidebar is hidden).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      const visible = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-tool-search]")).find(
        (el) => el.offsetParent !== null
      );
      if (visible) visible.focus();
      else {
        setMobileNavOpen(true);
        setTimeout(() => document.querySelector<HTMLInputElement>("input[data-tool-search]")?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const select = (id: string) => {
    setActiveId(id);
    setMobileNavOpen(false);
    try {
      window.history.pushState(null, "", `/t/${id}`);
    } catch {
      /* ignore */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const active = findTool(activeId) ?? ALL_TOOLS[0];
  const ActiveComponent = active.Component;
  const groupIndex = TOOL_GROUPS.findIndex((g) => g.tools.some((t) => t.id === active.id));
  const activeGroup = TOOL_GROUPS[groupIndex];
  const toolNumber = ALL_TOOLS.findIndex((t) => t.id === active.id) + 1;
  const content = getToolContent(active.id);
  const hasRefs = (content.sources?.length ?? 0) > 0 || (content.faq?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-[var(--line)] px-6 py-7 lg:flex print:hidden">
        <Brand onHome={() => select("routine-planner")} />
        <Settings units={units} setUnits={setUnits} theme={theme} onToggleTheme={toggle} />
        <ProfilePanel />
        <NavList activeId={active.id} query={query} setQuery={setQuery} onSelect={select} />
        <Footer />
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Brand onHome={() => select("routine-planner")} compact />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          className="btn swiss-label rounded-xl px-4 py-2 text-zinc-700 dark:text-zinc-200"
        >
          {mobileNavOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* ---- Mobile slide-down nav ---- */}
      {mobileNavOpen && (
        <div className="space-y-5 px-4 pb-6 pt-4 lg:hidden print:hidden">
          <Settings units={units} setUnits={setUnits} theme={theme} onToggleTheme={toggle} />
          <ProfilePanel />
          <NavList activeId={active.id} query={query} setQuery={setQuery} onSelect={select} />
        </div>
      )}

      {/* ---- Main content ---- */}
      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <header className="mb-8">
          <div className="swiss-label flex items-center gap-3 text-zinc-400">
            <span className="text-accent-600 dark:text-accent-400">
              {pad(groupIndex + 1)} / {activeGroup?.group}
            </span>
            <span aria-hidden className="h-px flex-1 bg-[var(--line)]" />
            <span>
              Tool {pad(toolNumber)} of {ALL_TOOLS.length}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
                {active.name}
              </h1>
              <p className="mt-2 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">{active.blurb}</p>
            </div>
            <ShareBar />
          </div>
        </header>

        <ActiveComponent />

        <RelatedTools group={activeGroup} activeId={active.id} onSelect={select} />

        {hasRefs && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <Sources items={content.sources} />
            <Faq items={content.faq} />
          </div>
        )}
      </main>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "More in this section" — the other tools in the active tool's group. */
function RelatedTools({
  group,
  activeId,
  onSelect,
}: {
  group: (typeof TOOL_GROUPS)[number] | undefined;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const others = group?.tools.filter((t) => t.id !== activeId) ?? [];
  if (others.length === 0) return null;
  return (
    <section className="mt-10 print:hidden">
      <h2 className="swiss-label mb-3 border-b border-[var(--line-strong)] pb-1.5 text-zinc-900 dark:text-zinc-100">
        More in {group?.group}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {others.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="btn group rounded-lg p-3.5 text-left"
          >
            <span className="flex items-center justify-between gap-2 font-semibold">
              {t.name}
              <span aria-hidden className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-accent-500">
                →
              </span>
            </span>
            <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">{t.blurb}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Settings({
  units,
  setUnits,
  theme,
  onToggleTheme,
}: {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SegmentedControl
        value={units}
        onChange={setUnits}
        options={[
          { value: "metric", label: "Metric" },
          { value: "imperial", label: "Imperial" },
        ]}
      />
      <button
        onClick={onToggleTheme}
        className="btn flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300"
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title="Toggle light / dark"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
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
  const norm = (s: string) => s.normalize("NFKD").toLowerCase();
  const q = norm(query.trim());
  // Groups the user opened; the active tool's group and search results are always open.
  const [opened, setOpened] = useLocalStorage<string[]>("vital.nav.open", [TOOL_GROUPS[0].group]);
  const toggleGroup = (name: string) =>
    setOpened((o) => (o.includes(name) ? o.filter((x) => x !== name) : [...o, name]));
  const filteredGroups = TOOL_GROUPS.map((g, i) => ({
    ...g,
    index: i + 1,
    tools: q
      ? g.tools.filter((t) => norm(t.name).includes(q) || norm(t.blurb).includes(q))
      : g.tools,
  })).filter((g) => g.tools.length > 0);

  return (
    <div className="space-y-5">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          aria-label="Search tools (press / )"
          data-tool-search
          className="field w-full rounded-lg py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-accent-500/40 dark:text-zinc-100"
        />
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
          <SearchIcon />
        </span>
        {!query && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-[var(--line)] px-1.5 text-[11px] font-medium text-zinc-500">
            /
          </kbd>
        )}
      </div>

      <nav className="space-y-4">
        {filteredGroups.length === 0 && (
          <p className="px-2 text-sm text-zinc-400">No tools match “{query}”.</p>
        )}
        {filteredGroups.map((g) => {
          const hasActive = g.tools.some((t) => t.id === activeId);
          const isOpen = !!q || hasActive || opened.includes(g.group);
          return (
          <div key={g.group}>
            <button
              type="button"
              onClick={() => toggleGroup(g.group)}
              disabled={!!q || hasActive}
              aria-expanded={isOpen}
              className="swiss-label mb-1.5 flex w-full items-baseline gap-2 border-b border-[var(--line-strong)] px-1 pb-1.5 text-left text-zinc-900 disabled:cursor-default dark:text-zinc-100"
            >
              <span className="text-accent-600 tabular-nums dark:text-accent-400">{pad(g.index)}</span>
              <span className="flex-1">{g.group}</span>
              <span className="font-normal tabular-nums text-zinc-400">{g.tools.length}</span>
              {!q && !hasActive && (
                <span aria-hidden className={"text-zinc-400 transition " + (isOpen ? "rotate-90" : "")}>
                  ▸
                </span>
              )}
            </button>
            {isOpen && (
            <div className="space-y-1">
              {g.tools.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "relative block w-full rounded-xl px-3 py-2 text-left text-sm transition " +
                      (isActive
                        ? "well font-semibold text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-[var(--fill)] hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50")
                    }
                  >
                    {isActive && (
                      <span aria-hidden className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r bg-accent-500" />
                    )}
                    {t.name}
                  </button>
                );
              })}
            </div>
            )}
          </div>
          );
        })}
      </nav>
    </div>
  );
}

function Brand({ onHome, compact }: { onHome: () => void; compact?: boolean }) {
  return (
    <button onClick={onHome} className="flex items-center gap-3 text-left" aria-label="Vital home">
      <div className="flex h-10 w-10 items-center justify-center bg-accent-500">
        <div className="h-3 w-3 bg-white" />
      </div>
      <div>
        <div className="text-xl font-bold leading-none tracking-tight">Vital</div>
        {!compact && (
          <div className="swiss-label mt-1 text-zinc-400">Hypertrophy &amp; fitness</div>
        )}
      </div>
    </button>
  );
}

function Footer() {
  return (
    <p className="mt-auto border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-zinc-500">
      Estimates for general guidance only, not medical advice. All data stays in
      your browser.
    </p>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
