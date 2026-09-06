"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle, Badge, InfoNote, Button } from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  SKILLS,
  SKILL_CATEGORIES,
  SKILL_PRINCIPLES,
  skillProgress,
  stepKey,
  type Skill,
  type SkillCategory,
} from "@/lib/skills";

const DIFFICULTY = ["", "Beginner", "Easy", "Moderate", "Hard", "Elite"];

function Difficulty({ level }: { level: number }) {
  return (
    <span className="text-xs text-zinc-400" title={`${DIFFICULTY[level]} (${level}/5)`}>
      {"●".repeat(level)}
      <span className="text-zinc-300 dark:text-zinc-700">{"●".repeat(5 - level)}</span>
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Skills() {
  // Ticked steps persist per device, so the ladder remembers where you are.
  const [doneList, setDoneList] = useLocalStorage<string[]>("vital.skills.done", []);
  const done = useMemo(() => new Set(doneList), [doneList]);
  const [category, setCategory] = useState<SkillCategory | "all">("all");
  const [openId, setOpenId] = useState<string>("handstand");

  const toggleStep = (skill: Skill, index: number) => {
    const key = stepKey(skill.id, index);
    setDoneList((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const clearSkill = (skill: Skill) =>
    setDoneList((prev) => prev.filter((k) => !k.startsWith(`${skill.id}:`)));

  const shown = SKILLS.filter((s) => category === "all" || s.category === category);
  const open = SKILLS.find((s) => s.id === openId);
  const openProgress = open ? skillProgress(open, done) : null;

  // Anything you've started but not finished — the "what am I working on" list.
  const inProgress = SKILLS.map((s) => ({ skill: s, p: skillProgress(s, done) }))
    .filter((x) => x.p.done > 0 && x.p.next)
    .sort((a, b) => b.p.pct - a.p.pct);

  return (
    <div className="space-y-5">
      {inProgress.length > 0 && (
        <Card>
          <CardTitle>What you&apos;re working on</CardTitle>
          <div className="space-y-3">
            {inProgress.map(({ skill, p }) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setOpenId(skill.id)}
                className="block w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    <span className="mr-1.5" aria-hidden>
                      {skill.emoji}
                    </span>
                    {skill.name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {p.done}/{p.total} steps
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Next: <span className="font-medium">{p.next!.name}</span> — {p.next!.criterion}
                </p>
                <div className="mt-2">
                  <ProgressBar pct={p.pct} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Pick a skill</CardTitle>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition " +
              (category === "all"
                ? "border-accent-500 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
                : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800")
            }
          >
            All
          </button>
          {SKILL_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={category === c.key}
              onClick={() => setCategory(c.key)}
              title={c.blurb}
              className={
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition " +
                (category === c.key
                  ? "border-accent-500 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800")
              }
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s) => {
            const p = skillProgress(s, done);
            const active = s.id === openId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenId(s.id)}
                aria-current={active ? "true" : undefined}
                className={
                  "rounded-xl border px-3 py-2.5 text-left transition " +
                  (active
                    ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50")
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    <span className="mr-1.5" aria-hidden>
                      {s.emoji}
                    </span>
                    {s.name}
                  </span>
                  <Difficulty level={s.difficulty} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{s.blurb}</p>
                <div className="mt-2">
                  <ProgressBar pct={p.pct} />
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {p.done}/{p.total} · {s.timeline}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {open && openProgress && (
        <>
          <Card>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">
                <span className="mr-1.5" aria-hidden>
                  {open.emoji}
                </span>
                {open.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{DIFFICULTY[open.difficulty]}</Badge>
                <Badge tone="neutral">{open.timeline}</Badge>
                <Badge>{openProgress.pct}% there</Badge>
              </div>
            </div>
            <p className="text-sm text-zinc-500">{open.blurb}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Before you start
                </h4>
                <ul className="space-y-1">
                  {open.prereqs.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="text-accent-500">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  How to practise it
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">{open.practice}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <CardTitle>The progression</CardTitle>
              <Button variant="ghost" onClick={() => clearSkill(open)}>
                Reset progress
              </Button>
            </div>
            <div className="space-y-2">
              {open.steps.map((step, i) => {
                const isDone = done.has(stepKey(open.id, i));
                const isNext = i === openProgress.nextIndex;
                return (
                  <label
                    key={step.name}
                    className={
                      "flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 transition " +
                      (isNext
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : isDone
                        ? "border-zinc-200 opacity-70 dark:border-zinc-800"
                        : "border-zinc-200 dark:border-zinc-800")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleStep(open, i)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent-500)]"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-semibold text-zinc-400">Step {i + 1}</span>
                        <span className={"font-medium " + (isDone ? "line-through" : "")}>
                          {step.name}
                        </span>
                        {isNext && <Badge>work on this</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        <span className="font-medium text-zinc-500">You own it when:</span>{" "}
                        {step.criterion}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{step.how}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <InfoNote>
              <p>
                Progress counts consecutive steps from the bottom: ticking step 4
                while step 2 is open doesn&apos;t move you up, because skipped
                steps are exactly what stalls a skill at the 80% mark.
              </p>
              <p>Ticks are saved on this device only.</p>
            </InfoNote>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardTitle>Common mistakes</CardTitle>
              <ul className="space-y-2">
                {open.mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <span className="text-zinc-400">✕</span>
                    {m}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle>Safety</CardTitle>
              <ul className="space-y-2">
                {open.safety.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <span className="text-amber-500">⚠</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardTitle>How to train skills at all</CardTitle>
        <ul className="space-y-1.5">
          {SKILL_PRINCIPLES.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-accent-500">•</span>
              {p}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
