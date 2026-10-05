"use client";

import { useState } from "react";
import { Card, TextInput, Select } from "../ui";
import { EXERCISES, EXERCISE_CATEGORIES, MUSCLES, MUSCLE_BY_ID, type MuscleId } from "@/lib/exercises";

export default function ExerciseLibrary() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleId | "">("");

  const q = query.trim().toLowerCase();
  const list = EXERCISES.filter(
    (e) => (!q || e.name.toLowerCase().includes(q)) && (!muscle || (e.muscles[muscle] ?? 0) > 0)
  ).sort((a, b) => (muscle ? (b.muscles[muscle] ?? 0) - (a.muscles[muscle] ?? 0) : 0));

  return (
    <Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <TextInput value={query} onChange={setQuery} placeholder="Search exercises" />
        <Select<MuscleId | "">
          value={muscle}
          onChange={setMuscle}
          options={[{ value: "", label: "All muscles" }, ...MUSCLES.map((m) => ({ value: m.id, label: m.name }))]}
        />
      </div>

      {list.length === 0 && <p className="text-sm text-zinc-500">No exercises match.</p>}

      {(muscle ? ["Results"] : EXERCISE_CATEGORIES).map((cat) => {
        const items = muscle ? list : list.filter((e) => e.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="mb-6 last:mb-0">
            {!muscle && (
              <h3 className="swiss-label mb-1 border-b border-[var(--line-strong)] pb-1.5 text-zinc-900 dark:text-zinc-100">
                {cat}
              </h3>
            )}
            <ul>
              {items.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--line)] py-2.5"
                >
                  <span className="font-medium">{e.name}</span>
                  <span className="flex flex-wrap gap-1.5">
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
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
        Dark tags are the main muscle (each set counts as 1 set); light tags are helpers (½ set).
        The Routine planner uses these numbers to count your weekly sets per muscle.
      </p>
    </Card>
  );
}
