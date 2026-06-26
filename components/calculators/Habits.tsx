"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  TextInput,
  Button,
  InfoNote,
  Stat,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";

interface Habit {
  id: string;
  name: string;
  // ISO date strings (YYYY-MM-DD) the habit was completed on.
  done: string[];
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Build the last `n` days, oldest first.
function lastDays(n: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d);
  }
  return out;
}

// Current streak: consecutive days up to today.
function currentStreak(done: Set<string>): number {
  let streak = 0;
  const d = new Date();
  // Allow today to be unchecked without breaking the streak.
  if (!done.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (done.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Longest streak across all recorded days.
function longestStreak(done: string[]): number {
  if (done.length === 0) return 0;
  const sorted = [...done].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

const WEEKS = 10; // ~70-day heatmap

export default function Habits() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("vital.habits", [
    { id: "1", name: "Train", done: [] },
    { id: "2", name: "8h sleep", done: [] },
  ]);
  const [newName, setNewName] = useState("");

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    setHabits((prev) => [...prev, { id: String(Date.now()), name, done: [] }]);
    setNewName("");
  };
  const removeHabit = (id: string) =>
    setHabits((prev) => prev.filter((h) => h.id !== id));

  const toggleToday = (id: string) => {
    const today = dayKey(new Date());
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              done: h.done.includes(today)
                ? h.done.filter((d) => d !== today)
                : [...h.done, today],
            }
          : h
      )
    );
  };

  const days = lastDays(WEEKS * 7);
  const today = dayKey(new Date());

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Add a habit</CardTitle>
        <div className="flex gap-3">
          <div className="flex-1">
            <TextInput
              value={newName}
              onChange={setNewName}
              placeholder="e.g. Drink water, Read 10 pages…"
            />
          </div>
          <Button onClick={addHabit}>Add</Button>
        </div>
        <InfoNote>
          <p>
            Check a habit off each day to build a streak. Current streak counts
            consecutive days up to today; longest is your all-time best.
          </p>
          <p>
            The heatmap shows the last {WEEKS} weeks — darker = done. Everything
            saves to localStorage.
          </p>
        </InfoNote>
      </Card>

      {habits.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500">
            No habits yet — add one above to get started.
          </p>
        </Card>
      )}

      {habits.map((h) => {
        const doneSet = new Set(h.done);
        const cur = currentStreak(doneSet);
        const longest = longestStreak(h.done);
        const checkedToday = doneSet.has(today);

        return (
          <Card key={h.id}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleToday(h.id)}
                  className={
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition " +
                    (checkedToday
                      ? "border-accent-500 bg-accent-500 text-white"
                      : "border-zinc-300 text-transparent hover:border-accent-400 dark:border-zinc-600")
                  }
                  aria-label="Toggle today"
                >
                  ✓
                </button>
                <h3 className="text-lg font-semibold">{h.name}</h3>
              </div>
              <button
                onClick={() => removeHabit(h.id)}
                className="text-xs text-red-500 hover:underline"
              >
                remove
              </button>
            </div>

            <div className="mb-4 flex gap-3">
              <Stat label="Current streak" value={`${cur} 🔥`} />
              <Stat label="Longest streak" value={`${longest} d`} />
              <Stat label="Total days" value={h.done.length} />
            </div>

            {/* Calendar heatmap: columns = weeks, rows = weekday */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {Array.from({ length: WEEKS }).map((_, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const idx = w * 7 + d;
                    const date = days[idx];
                    if (!date) return <div key={d} className="h-3.5 w-3.5" />;
                    const k = dayKey(date);
                    const isDone = doneSet.has(k);
                    const isToday = k === today;
                    return (
                      <div
                        key={d}
                        title={`${k}${isDone ? " · done" : ""}`}
                        className={
                          "h-3.5 w-3.5 rounded-sm " +
                          (isDone
                            ? "bg-accent-500"
                            : "bg-zinc-100 dark:bg-zinc-800") +
                          (isToday ? " ring-1 ring-accent-400" : "")
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
