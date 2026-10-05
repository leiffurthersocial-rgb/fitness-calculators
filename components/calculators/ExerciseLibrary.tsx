"use client";

import { useState } from "react";
import { Card, TextInput, Select } from "../ui";
import {
  EXERCISES,
  EXERCISE_CATEGORIES,
  MUSCLES,
  MUSCLE_BY_ID,
  MUSCLE_REGIONS,
  bestExercisesFor,
  type Exercise,
  type MuscleId,
} from "@/lib/exercises";

const pct = (n: number) => `${Math.round(n * 100)}%`;

function fatigueLabel(f: number): string {
  if (f >= 1.5) return "Very high";
  if (f >= 1.1) return "High";
  if (f >= 0.8) return "Moderate";
  return "Low";
}

export default function ExerciseLibrary() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleId | "">("");

  const q = query.trim().toLowerCase();
  const matches = (e: Exercise) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);

  // With a muscle picked: prime movers ranked best first, then exercises that train it as a helper.
  const sections: { title: string; items: Exercise[] }[] = muscle
    ? [
        { title: `Best for ${MUSCLE_BY_ID[muscle].name.toLowerCase()}`, items: bestExercisesFor(muscle).filter(matches) },
        {
          title: `Also trains ${MUSCLE_BY_ID[muscle].name.toLowerCase()} (½ set)`,
          items: EXERCISES.filter((e) => e.muscles[muscle] === 0.5 && matches(e)),
        },
      ]
    : EXERCISE_CATEGORIES.map((c) => ({ title: c, items: EXERCISES.filter((e) => e.category === c && matches(e)) }));

  return (
    <Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <TextInput value={query} onChange={setQuery} placeholder="Search exercises" />
        <select
          aria-label="Filter by muscle"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleId | "")}
          className="field w-full rounded-lg px-3.5 py-2.5 text-[15px] text-zinc-900 outline-none dark:text-zinc-100"
        >
          <option value="">All muscles</option>
          {MUSCLE_REGIONS.map((r) => (
            <optgroup key={r} label={r}>
              {MUSCLES.filter((m) => m.region === r).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.detail}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <strong className="text-zinc-800 dark:text-zinc-200">Efficiency</strong>{" "}
        is how reliably a set
        turns into stimulating reps for the main muscle: it&apos;s highest when that muscle is what
        fails (stable machines and cables, a resistance curve that matches the muscle) and lower when
        balance, grip, the lower back or helper muscles give out first.{" "}
        <strong className="text-zinc-800 dark:text-zinc-200">Fatigue</strong> is the systemic cost per
        hard set; heavy compounds tire you for the rest of the session.
      </p>

      {sections.every((s) => s.items.length === 0) && <p className="text-sm text-zinc-500">No exercises match.</p>}

      {sections.map(({ title, items }) =>
        items.length === 0 ? null : (
          <section key={title} className="mb-8 last:mb-0">
            <h3 className="swiss-label mb-1 flex items-baseline justify-between border-b border-[var(--line-strong)] pb-1.5 text-zinc-900 dark:text-zinc-100">
              <span>{title}</span>
              <span className="font-normal text-zinc-500">{items.length}</span>
            </h3>
            <ul>
              {items.map((e) => (
                <ExerciseRow key={e.id} e={e} />
              ))}
            </ul>
          </section>
        )
      )}
    </Card>
  );
}

function ExerciseRow({ e }: { e: Exercise }) {
  return (
    <li className="grid gap-x-4 gap-y-1.5 border-b border-[var(--line)] py-3 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="font-medium">{e.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(Object.entries(e.muscles) as [MuscleId, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([m, c]) => (
              <span
                key={m}
                className={
                  "px-2 py-0.5 text-xs " +
                  (c === 1
                    ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "well text-zinc-700 dark:text-zinc-300")
                }
              >
                {MUSCLE_BY_ID[m].name} {c === 1 ? "1" : "½"}
              </span>
            ))}
        </div>
        <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">{e.notes.join(" · ")}</div>
      </div>
      <div className="flex gap-4 text-right sm:block sm:space-y-1">
        <div>
          <div className="text-xs text-zinc-500">Efficiency</div>
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-16 bg-zinc-200 dark:bg-zinc-700">
              <div
                className={e.efficiency >= 0.95 ? "h-full bg-accent-500" : "h-full bg-zinc-800 dark:bg-zinc-200"}
                style={{ width: `${((e.efficiency - 0.6) / 0.4) * 100}%` }}
              />
            </div>
            <span className="w-10 text-sm font-semibold tabular-nums">{pct(e.efficiency)}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Fatigue</div>
          <div className="text-sm font-medium">{fatigueLabel(e.fatigue)}</div>
        </div>
      </div>
    </li>
  );
}
