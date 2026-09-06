"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  Select,
  Badge,
  Stat,
  InfoNote,
  EmptyHint,
} from "../ui";
import SessionTimer, { fmtDuration, type TimerStep } from "../SessionTimer";
import {
  MOBILITY_GOALS,
  LEVELS,
  METHOD_LABEL,
  generateSession,
  sessionSteps,
  goalLabel,
  type MobilityGoal,
  type Level,
  type Equipment,
} from "@/lib/mobility";

const KIT: { key: Exclude<Equipment, "none">; label: string; hint: string }[] = [
  { key: "wall", label: "Wall / doorway", hint: "or a sofa, a rack, a pole" },
  { key: "block", label: "Block or books", hint: "anything to sit or lean on" },
  { key: "band", label: "Resistance band", hint: "shoulder work" },
  { key: "weight", label: "A weight", hint: "loaded end-range work" },
];

const TIMES = [5, 10, 15, 20, 30, 45, 60];

/** Colour the method so loaded/contract–relax work stands out from the holds. */
const METHOD_TONE: Record<string, "accent" | "warn" | "neutral"> = {
  loaded: "accent",
  contractRelax: "accent",
  isometric: "accent",
  static: "neutral",
  dynamic: "neutral",
  car: "neutral",
};

export default function Mobility() {
  const [goals, setGoals] = useState<MobilityGoal[]>(["hipFlexors", "thoracic"]);
  const [minutes, setMinutes] = useState(20);
  const [level, setLevel] = useState<Level>("intermediate");
  const [kit, setKit] = useState<Exclude<Equipment, "none">[]>(["wall", "block"]);

  const toggleGoal = (g: MobilityGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const toggleKit = (k: Exclude<Equipment, "none">) =>
    setKit((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const session = useMemo(
    () => generateSession({ goals, minutes, level, equipment: kit }),
    [goals, minutes, level, kit]
  );

  const steps: TimerStep[] = useMemo(
    () =>
      sessionSteps(session).map((s) => ({
        key: s.key,
        label: s.label,
        seconds: s.seconds,
        cue: s.cue,
        detail: s.detail,
        tone: s.kind === "setup" ? "prep" : s.detail.startsWith("Finish") ? "rest" : "work",
      })),
    [session]
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>What do you want to open up?</CardTitle>
        <div className="flex flex-wrap gap-2">
          {MOBILITY_GOALS.map((g) => {
            const on = goals.includes(g.key);
            return (
              <button
                key={g.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGoal(g.key)}
                title={g.blurb}
                className={
                  "rounded-xl border px-3 py-2 text-left text-sm transition " +
                  (on
                    ? "border-accent-500 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800")
                }
              >
                <span className="mr-1.5" aria-hidden>
                  {g.emoji}
                </span>
                <span className="font-medium">{g.label}</span>
                <span className="block text-xs font-normal text-zinc-400">{g.blurb}</span>
              </button>
            );
          })}
        </div>
        {goals.length === 0 && (
          <div className="mt-3">
            <EmptyHint>Pick at least one goal — the session is built entirely around what you choose.</EmptyHint>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Field label="Time you have" hint="minutes">
            <Select
              value={String(minutes)}
              onChange={(v) => setMinutes(parseInt(v))}
              options={TIMES.map((t) => ({ value: String(t), label: `${t} minutes` }))}
            />
          </Field>
          <Field label="Experience">
            <Select
              value={level}
              onChange={setLevel}
              options={LEVELS.map((l) => ({ value: l.key, label: `${l.label} — ${l.blurb}` }))}
            />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              What you have
            </span>
            <div className="flex flex-wrap gap-1.5">
              {KIT.map((k) => {
                const on = kit.includes(k.key);
                return (
                  <button
                    key={k.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleKit(k.key)}
                    title={k.hint}
                    className={
                      "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition " +
                      (on
                        ? "border-accent-500 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800")
                    }
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              Nothing selected still works — you just get the floor-only version.
            </p>
          </div>
        </div>
        <InfoNote>
          <p>
            The session is built in three blocks: prep (joint circles and dynamic
            work to warm the tissue), main work (long holds, loaded end-range and
            contract–relax, which is what actually changes range), and a finish
            that down-regulates so the new range is kept rather than braced away.
          </p>
          <p>
            Exercises are picked round-robin across your goals, so two goals
            alternate rather than the first one eating the whole session — and
            the total is fitted to the minutes you have, trimming the lowest
            priority work first.
          </p>
        </InfoNote>
      </Card>

      {session.blocks.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{fmtDuration(session.totalSec)} total</Badge>
            <Badge tone="neutral">{session.blocks.reduce((n, b) => n + b.items.length, 0)} exercises</Badge>
            {goals.map((g) => (
              <Badge key={g} tone="neutral">
                {goalLabel(g)}
              </Badge>
            ))}
          </div>

          <SessionTimer steps={steps} title="Guided mobility session" />

          {session.blocks.map((block) => (
            <Card key={block.block}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{block.label}</h3>
                <Badge tone="neutral">{fmtDuration(block.totalSec)}</Badge>
              </div>
              <p className="mb-3 text-sm text-zinc-500">{block.purpose}</p>
              <div className="space-y-2">
                {block.items.map((item) => (
                  <div
                    key={item.exercise.id}
                    className="rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{item.exercise.name}</span>
                      <span className="font-mono text-sm tabular-nums text-zinc-500">
                        {fmtDuration(item.seconds)}
                        {item.exercise.perSide && " each side"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{item.exercise.cue}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={METHOD_TONE[item.exercise.method] ?? "neutral"}>
                        {METHOD_LABEL[item.exercise.method]}
                      </Badge>
                      {item.serves.map((g) => (
                        <Badge key={g} tone="neutral">
                          {goalLabel(g)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card>
            <CardTitle>Weekly dose</CardTitle>
            <p className="mb-3 text-sm text-zinc-500">
              About 5 minutes of work per week per position captures most of the
              range you can gain. Here&apos;s how many of these sessions that takes.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {session.weekly
                .filter((w) => w.secPerSession > 0)
                .map((w) => (
                  <Stat
                    key={w.goal}
                    label={goalLabel(w.goal)}
                    value={`${w.sessionsForDose}×`}
                    unit={`/week · ${fmtDuration(w.secPerSession)} each`}
                  />
                ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Coaching notes</CardTitle>
            <ul className="space-y-1.5">
              {session.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="text-accent-500">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
