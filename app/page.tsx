import Link from "next/link";
import type { Metadata } from "next";
import { TOOL_GROUPS, ALL_TOOLS } from "@/lib/tools";
import ThemeToggle from "@/components/ThemeToggle";
import LegacyHashRedirect from "@/components/LegacyHashRedirect";

export const metadata: Metadata = {
  title: "Vital — Free Science-Based Health & Fitness Calculators",
  description:
    "A suite of clean, science-based health & fitness calculators — strength standards, VDOT running paces, TDEE & macros, a cut/bulk planner, FFMI, muscle-gain potential and more. Free, private, works offline.",
  alternates: { canonical: "/" },
};

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <LegacyHashRedirect />

      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-600 text-lg font-black text-white">
            V
          </div>
          <div>
            <div className="text-lg font-bold leading-none">Vital</div>
            <div className="text-xs text-zinc-400">Health &amp; fitness hub</div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Science-based health &amp; fitness calculators
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
          {ALL_TOOLS.length} clean, referenced tools for strength, cardio,
          nutrition and recovery — from VDOT running paces and a cut/bulk planner
          to strength standards and muscle-gain potential. No sign-up, your data
          stays in your browser, and it works offline.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/t/my-numbers"
            className="rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
          >
            Open the dashboard →
          </Link>
          <Link
            href="/t/diet-planner"
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cut / bulk planner
          </Link>
        </div>
      </section>

      <div className="space-y-8">
        {TOOL_GROUPS.map((g) => (
          <section key={g.group}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              <span aria-hidden>{g.emoji}</span>
              {g.group}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.tools.map((t) => (
                <Link
                  key={t.id}
                  href={`/t/${t.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-accent-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-accent-600"
                >
                  <div className="font-semibold text-zinc-900 group-hover:text-accent-700 dark:text-zinc-50 dark:group-hover:text-accent-400">
                    {t.name}
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-500">{t.blurb}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-zinc-100 pt-6 text-xs leading-relaxed text-zinc-400 dark:border-zinc-800">
        Estimates are for general guidance only and are not medical advice. All
        calculations run in your browser; nothing is uploaded.
      </footer>
    </div>
  );
}
