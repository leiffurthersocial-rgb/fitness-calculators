"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  InfoNote,
  Badge,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import {
  GOALS,
  EQUIPMENT,
  generatePlan,
  goalForSport,
  volumeTarget,
  type Goal,
  type MainLift,
  type Equipment,
} from "@/lib/workoutPlan";
import { SPORTS_DB } from "@/lib/buildRater";
import {
  weightFromKg,
  weightToKg,
  weightUnit,
  loadingIncrement,
  fmt,
} from "@/lib/units";

const LIFTS: { key: MainLift; label: string }[] = [
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench" },
  { key: "deadlift", label: "Deadlift" },
  { key: "ohp", label: "Overhead" },
];

export default function WorkoutPlan() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const inc = loadingIncrement(units);

  const [goal, setGoal] = useState<Goal>("athletic");
  const [days, setDays] = useState(4);
  const [equipment, setEquipment] = useState<Equipment>("full");
  const [tailor, setTailor] = useState(false);
  const [sportKey, setSportKey] = useState("basketball");
  const sport = SPORTS_DB.find((s) => s.key === sportKey)!;
  const [posKey, setPosKey] = useState(sport.positions[0].key);

  const [bw, setBw] = useState(
    Math.round(weightFromKg(DEFAULTS.bodyweightKg, units))
  );
  const [oneRMs, setOneRMs] = useState<Record<MainLift, number>>({
    squat: 0,
    bench: 0,
    deadlift: 0,
    ohp: 0,
  });

  const position =
    sport.positions.find((p) => p.key === posKey) ?? sport.positions[0];

  // Identify weak lifts: those below the position's target ratio.
  const weakLifts = useMemo<MainLift[]>(() => {
    if (!tailor) return [];
    const bwKg = weightToKg(bw, units);
    const out: MainLift[] = [];
    for (const { key } of LIFTS) {
      const target = position.targets[key];
      const oneRM = oneRMs[key];
      if (target && oneRM > 0 && bwKg > 0 && weightToKg(oneRM, units) / bwKg < target) {
        out.push(key);
      }
    }
    return out;
  }, [tailor, position, oneRMs, bw, units]);

  const suggestedGoal = tailor ? goalForSport(sportKey, posKey) : goal;

  const plan = useMemo(() => {
    const rmKg: Partial<Record<MainLift, number>> = {};
    for (const { key } of LIFTS) {
      if (oneRMs[key] > 0) rmKg[key] = weightToKg(oneRMs[key], units);
    }
    return generatePlan({
      goal,
      daysPerWeek: days,
      equipment,
      incrementKg: inc,
      oneRMs: rmKg,
      weakLifts,
    });
  }, [goal, days, equipment, inc, oneRMs, weakLifts, units]);

  const vt = volumeTarget(goal);

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Build your plan</CardTitle>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Goal">
              <Select
                value={goal}
                onChange={setGoal}
                options={GOALS.map((g) => ({ value: g.key, label: `${g.label} — ${g.blurb}` }))}
              />
            </Field>
            <Field label="Training days per week">
              <SegmentedControl
                value={String(days)}
                onChange={(v) => setDays(parseInt(v))}
                options={[
                  { value: "3", label: "3 days" },
                  { value: "4", label: "4 days" },
                  { value: "5", label: "5 days" },
                ]}
              />
            </Field>
            <Field label="Equipment">
              <Select
                value={equipment}
                onChange={setEquipment}
                options={EQUIPMENT.map((e) => ({ value: e.key, label: e.label }))}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={tailor}
                onChange={(e) => setTailor(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent-500)]"
              />
              <span className="text-sm font-medium">
                Tailor to a sport &amp; target my weak lifts
              </span>
            </label>
            {tailor && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sport">
                  <Select
                    value={sportKey}
                    onChange={(k) => {
                      setSportKey(k);
                      const s = SPORTS_DB.find((x) => x.key === k)!;
                      setPosKey(s.positions[0].key);
                    }}
                    options={SPORTS_DB.map((s) => ({ value: s.key, label: s.label }))}
                  />
                </Field>
                <Field label="Position">
                  <Select
                    value={position.key}
                    onChange={setPosKey}
                    options={sport.positions.map((p) => ({ value: p.key, label: p.label }))}
                  />
                </Field>
              </div>
            )}
            {tailor && suggestedGoal !== goal && (
              <Tip>
                For {sport.label.toLowerCase()} / {position.label.toLowerCase()},
                a <strong>{GOALS.find((g) => g.key === suggestedGoal)?.label}</strong>{" "}
                focus fits best —{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => setGoal(suggestedGoal)}
                >
                  use it
                </button>
                .
              </Tip>
            )}
          </div>

          <div className="space-y-4">
            <Field label={`Bodyweight (${wu})`} hint="for weak-lift detection">
              <NumberInput value={bw} onChange={setBw} suffix={wu} />
            </Field>
            <div>
              <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your 1RMs{" "}
                <span className="font-normal text-zinc-400">
                  (optional — fills in working weights)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {LIFTS.map((l) => (
                  <Field key={l.key} label={`${l.label} (${wu})`}>
                    <NumberInput
                      value={oneRMs[l.key]}
                      onChange={(v) => setOneRMs((p) => ({ ...p, [l.key]: v }))}
                      step={2.5}
                      suffix={wu}
                    />
                  </Field>
                ))}
              </div>
            </div>
            {weakLifts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">Weak points:</span>
                {weakLifts.map((w) => (
                  <Badge key={w} tone="warn">
                    {LIFTS.find((l) => l.key === w)?.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <InfoNote>
          <p>
            The split trains every muscle ~2× per week — at matched volume that
            beats once-weekly splits for growth. Set/rep/intensity follow the
            goal, with a target RIR (reps in reserve) rather than always going to
            failure, and the weekly-volume card checks each muscle lands in the
            productive range.
          </p>
          <p>
            Working weights come from your 1RMs (barbell mode) via training-max
            percentages. Tailor to a sport and any lift below that role&apos;s
            target ratio gets an extra set, plus we suggest the best-matching
            goal.
          </p>
        </InfoNote>
      </Card>

      {/* The plan */}
      <div className="grid gap-5 md:grid-cols-2">
        {plan.days.map((day, i) => (
          <Card key={i}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                Day {i + 1} · {day.label}
              </h3>
              <Badge tone="neutral">{day.exercises.length} exercises</Badge>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Exercise</th>
                    <th className="px-3 py-2 font-medium">Sets×Reps</th>
                    <th className="px-3 py-2 font-medium">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {day.exercises.map((ex, j) => (
                    <tr key={j} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-medium">
                        {ex.name}
                        {ex.emphasised && (
                          <span className="ml-1.5">
                            <Badge tone="warn">focus</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {ex.sets}×{ex.reps}
                        <div className="text-xs font-normal text-zinc-400">{ex.rir}</div>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {ex.weightKg
                          ? `${fmt(weightFromKg(ex.weightKg, units))} ${wu}`
                          : ex.pct
                          ? `${Math.round(ex.pct * 100)}% 1RM`
                          : "hard effort"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {day.finisher && (
              <p className="mt-2 text-xs text-zinc-500">🔥 {day.finisher}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Weekly volume per muscle */}
      <Card>
        <CardTitle>Weekly volume</CardTitle>
        <p className="mb-3 text-sm text-zinc-500">{vt.label}.</p>
        <div className="space-y-2">
          {plan.volume.map((v) => {
            const inRange = v.sets >= vt.min && v.sets <= vt.max;
            const tone =
              v.sets < vt.min ? "#f59e0b" : v.sets > vt.max ? "#ef4444" : "#10b981";
            return (
              <div key={v.muscle}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{v.muscle}</span>
                  <span className="text-zinc-400">
                    {Math.round(v.sets)} sets · {v.frequency}×/week
                    {!inRange && (
                      <span className="ml-1 text-amber-500">
                        {v.sets < vt.min ? "below range" : "high"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (v.sets / (vt.max + 4)) * 100)}%`,
                      backgroundColor: tone,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Each bar is total hard sets per week; the target band is {vt.min}–{vt.max}.
          Every muscle is hit at least 2×/week.
        </p>
      </Card>

      <Card>
        <CardTitle>Coaching notes</CardTitle>
        <ul className="space-y-1.5">
          {plan.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-accent-500">•</span>
              {n}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
