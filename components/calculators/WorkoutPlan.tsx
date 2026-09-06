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
  Stat,
  Tip,
  EmptyHint,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField } from "@/lib/profile";
import {
  GOALS,
  EQUIPMENT,
  MUSCLES,
  generatePlan,
  goalForSport,
  volumeTarget,
  availableSplits,
  defaultSplit,
  type Goal,
  type MainLift,
  type Equipment,
  type Split,
  type Muscle,
} from "@/lib/workoutPlan";
import {
  rateProgram,
  wnsTarget,
  type Nutrition,
  type Stress,
} from "@/lib/programRating";
import { SPORTS_DB } from "@/lib/buildRater";
import { TRAINING_LEVELS } from "@/lib/formulas";
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

const DAY_OPTIONS = [2, 3, 4, 5, 6];

/** Colour the effectiveness score the way a grade reads. */
function scoreTone(score: number): string {
  if (score >= 87) return "#10b981";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

export default function WorkoutPlan() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const inc = loadingIncrement(units);

  const [goal, setGoal] = useState<Goal>("athletic");
  const [days, setDays] = useState(4);
  const [split, setSplit] = useState<Split>("upperLower");
  const [equipment, setEquipment] = useState<Equipment>("full");
  const [maxSets, setMaxSets] = useState(0); // 0 = no cap
  const [tailor, setTailor] = useState(false);
  // Customisation: "auto" defers to the goal; on/off overrides it.
  const [conditioning, setConditioning] = useState<"auto" | "on" | "off">("auto");
  const [plyo, setPlyo] = useState<"auto" | "on" | "off">("auto");
  const [emphasis, setEmphasis] = useState<Muscle | "none">("none");
  // Recovery context — what turns a set count into an effectiveness rating.
  const [sleepHours, setSleepHours] = useState(7.5);
  const [stress, setStress] = useState<Stress>("moderate");
  const [nutrition, setNutrition] = useState<Nutrition>("maintenance");
  const isEndurance = goal === "endurance";

  // Switching frequency resets the split to the best one for that day count.
  const changeDays = (d: number) => {
    setDays(d);
    setSplit(defaultSplit(d));
  };
  const splitOptions = availableSplits(days);
  const splitInfo = splitOptions.find((s) => s.key === split) ?? splitOptions[0];
  const [sportKey, setSportKey] = useState("basketball");
  const sport = SPORTS_DB.find((s) => s.key === sportKey)!;
  const [posKey, setPosKey] = useState(sport.positions[0].key);

  const [bw, setBw] = useWeightField(units);
  const { profile, patch, patchLifts } = useProfile();
  const liftDisp = (kg: number) => (kg > 0 ? Number(weightFromKg(kg, units).toFixed(1)) : 0);
  const oneRMs: Record<MainLift, number> = {
    squat: liftDisp(profile.lifts.squat),
    bench: liftDisp(profile.lifts.bench),
    deadlift: liftDisp(profile.lifts.deadlift),
    ohp: liftDisp(profile.lifts.ohp),
  };
  const setOneRM = (key: MainLift, v: number) =>
    patchLifts({ [key]: v ? weightToKg(v, units) : 0 });

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
  }, [tailor, position, profile.lifts, bw, units]);

  const suggestedGoal = tailor ? goalForSport(sportKey, posKey) : goal;

  const plan = useMemo(() => {
    const rmKg: Partial<Record<MainLift, number>> = {};
    for (const { key } of LIFTS) {
      if (oneRMs[key] > 0) rmKg[key] = weightToKg(oneRMs[key], units);
    }
    return generatePlan({
      goal,
      daysPerWeek: days,
      split,
      equipment,
      incrementKg: inc,
      maxSets,
      oneRMs: rmKg,
      weakLifts,
      includeConditioning: conditioning === "auto" ? undefined : conditioning === "on",
      includePlyo: plyo === "auto" ? undefined : plyo === "on",
      emphasis: emphasis === "none" ? undefined : emphasis,
    });
  }, [goal, days, split, equipment, inc, maxSets, profile.lifts, weakLifts, conditioning, plyo, emphasis, units]);

  const rating = useMemo(
    () =>
      rateProgram(plan, {
        sleepHours,
        stress,
        nutrition,
        age: profile.age,
        experience: profile.experience,
      }),
    [plan, sleepHours, stress, nutrition, profile.age, profile.experience]
  );

  const vt = volumeTarget(goal);
  const wt = wnsTarget(goal);

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
                onChange={(v) => changeDays(parseInt(v))}
                options={DAY_OPTIONS.map((d) => ({ value: String(d), label: String(d) }))}
              />
            </Field>
            {!isEndurance && (
              <Field
                label="Split style"
                hint={splitInfo ? `${splitInfo.sessionFrequency}× per session type` : undefined}
              >
                <Select
                  value={split}
                  onChange={setSplit}
                  options={splitOptions.map((s) => ({
                    value: s.key,
                    label: `${s.label} — every muscle ${s.minMuscleFrequency}×/week`,
                  }))}
                />
                {splitInfo && (
                  <p className="mt-1.5 text-xs text-zinc-400">
                    {splitInfo.pattern}. {splitInfo.blurb}
                  </p>
                )}
              </Field>
            )}
            {!isEndurance && splitInfo && splitInfo.minMuscleFrequency < 1.5 && (
              <Tip>
                This split only reaches {splitInfo.minMuscleFrequency}×/week for
                some muscles. On {days} days,{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => setSplit(splitOptions[0].key)}
                >
                  {splitOptions[0].label}
                </button>{" "}
                gets every muscle to {splitOptions[0].minMuscleFrequency}× — the
                same sets, done fresher.
              </Tip>
            )}
            <Field label="Equipment">
              <Select
                value={equipment}
                onChange={setEquipment}
                options={EQUIPMENT.map((e) => ({ value: e.key, label: e.label }))}
              />
            </Field>
            {!isEndurance && (
              <Field label="Max sets per session" hint="caps total work">
                <Select
                  value={String(maxSets)}
                  onChange={(v) => setMaxSets(parseInt(v))}
                  options={[
                    { value: "0", label: "No limit" },
                    { value: "10", label: "10 sets" },
                    { value: "12", label: "12 sets" },
                    { value: "15", label: "15 sets" },
                    { value: "18", label: "18 sets" },
                    { value: "20", label: "20 sets" },
                  ]}
                />
              </Field>
            )}
            {!isEndurance && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Conditioning" hint="cardio finishers">
                  <Select
                    value={conditioning}
                    onChange={setConditioning}
                    options={[
                      { value: "auto", label: "Auto (by goal)" },
                      { value: "on", label: "Include" },
                      { value: "off", label: "None" },
                    ]}
                  />
                </Field>
                <Field label="Plyometrics" hint="jump work">
                  <Select
                    value={plyo}
                    onChange={setPlyo}
                    options={[
                      { value: "auto", label: "Auto (by goal)" },
                      { value: "on", label: "Include" },
                      { value: "off", label: "None" },
                    ]}
                  />
                </Field>
                <Field label="Emphasis muscle" hint="extra weekly volume">
                  <Select
                    value={emphasis}
                    onChange={setEmphasis}
                    options={[
                      { value: "none", label: "None" },
                      ...MUSCLES.map((m) => ({ value: m, label: m })),
                    ]}
                  />
                </Field>
              </div>
            )}
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
                      onChange={(v) => setOneRM(l.key, v)}
                      step={2.5}
                      suffix={wu}
                    />
                  </Field>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Recovery context{" "}
                <span className="font-normal text-zinc-400">
                  (what the effectiveness rating weighs the fatigue against)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sleep" hint="typical night">
                  <NumberInput
                    value={sleepHours}
                    onChange={setSleepHours}
                    min={3}
                    max={12}
                    suffix="h"
                  />
                </Field>
                <Field label="Life stress">
                  <Select
                    value={stress}
                    onChange={setStress}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "moderate", label: "Moderate" },
                      { value: "high", label: "High" },
                    ]}
                  />
                </Field>
                <Field label="Calories">
                  <Select
                    value={nutrition}
                    onChange={setNutrition}
                    options={[
                      { value: "deficit", label: "Deficit (cutting)" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "surplus", label: "Surplus (bulking)" },
                    ]}
                  />
                </Field>
                <Field label="Experience" hint="from your profile">
                  <Select
                    value={profile.experience}
                    onChange={(v) => patch({ experience: v })}
                    options={TRAINING_LEVELS.map((l) => ({ value: l.key, label: `${l.label} (${l.years})` }))}
                  />
                </Field>
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
            {equipment === "full" && LIFTS.every((l) => oneRMs[l.key] === 0) && (
              <EmptyHint>
                Enter your 1RMs to get exact working weights — otherwise the plan
                shows %1RM targets to fill in yourself.
              </EmptyHint>
            )}
          </div>
        </div>
        <InfoNote>
          <p>
            The split is built from session types plus a rolling weekly cycle, so
            every major muscle is trained at least 1.5× and usually 2× a week —
            on four days, Anterior/Posterior means one anterior and one posterior
            session, each run twice, not four different workouts.
          </p>
          <p>
            Set counts are lower than the usual recommendation on purpose. Only
            the last ~5 reps before failure recruit and slow high-threshold motor
            units enough to signal growth, so the plan runs fewer sets taken
            closer to failure and counts those stimulating reps rather than sets.
          </p>
          <p>
            Working weights come from your 1RMs (barbell mode) via training-max
            percentages. Tailor to a sport and any lift below that role&apos;s
            target ratio gets an extra set, plus we suggest the best-matching
            goal.
          </p>
        </InfoNote>
      </Card>

      {/* Effectiveness rating */}
      <Card>
        <CardTitle>Program effectiveness</CardTitle>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            <div className="rounded-xl bg-accent-50 px-4 py-3 dark:bg-accent-900/20">
              <div className="text-xs font-medium uppercase tracking-wide text-accent-700 dark:text-accent-400">
                Effectiveness
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: scoreTone(rating.score) }}
                >
                  {rating.score}
                </span>
                <span className="text-lg font-semibold text-zinc-400">/ 100</span>
                <span className="ml-auto text-2xl font-bold">{rating.grade}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{rating.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Stimulating reps / week" value={Math.round(rating.totalWns)} />
              <Stat label="Stimulus per fatigue unit" value={fmt(rating.sfr, 2)} />
              <Stat
                label="Fatigue vs recovery"
                value={Math.round(rating.fatigueLoad * 100)}
                unit="%"
              />
              <Stat label="Per session" value={rating.sessionMinutes} unit="min" />
            </div>
          </div>

          <div className="space-y-2.5">
            {rating.drivers.map((d) => (
              <div key={d.label}>
                <div className="mb-0.5 flex items-baseline justify-between text-xs">
                  <span className="font-medium">
                    {d.label}
                    <span className="ml-1.5 font-normal text-zinc-400">
                      {Math.round(d.weight * 100)}% of the score
                    </span>
                  </span>
                  <span className="tabular-nums text-zinc-400">{d.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.score}%`, backgroundColor: scoreTone(d.score) }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {rating.flags.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {rating.flags.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span
                  className={
                    f.tone === "good"
                      ? "text-emerald-500"
                      : f.tone === "warn"
                      ? "text-amber-500"
                      : "text-red-500"
                  }
                >
                  {f.tone === "good" ? "✓" : f.tone === "warn" ? "!" : "✕"}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            What to change
          </div>
          <ul className="space-y-1">
            {rating.improvements.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="text-accent-500">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <InfoNote>
          <p>
            <strong>WNS — the weekly number of stimulating reps.</strong> Only
            reps close to failure both recruit the high-threshold motor units and
            slow the fibres enough to signal growth, so a set contributes about{" "}
            <code>min(reps, 5 − RIR)</code> stimulating reps. Three sets of eight
            at 1 RIR is twelve; five sets of twelve at 4 RIR is five, for far more
            fatigue. Primary movers count in full, assisting movers at half.
          </p>
          <p>
            <strong>Fatigue.</strong> Each set is costed by the exercise (heavy
            axial compounds cost far more than isolation work), by proximity to
            failure and by load, then weighed against a recovery capacity
            estimated from your training days, sleep, life stress, calorie intake,
            age and experience. Above 100% the program is outrunning what you can
            absorb.
          </p>
          <p>
            The overall score blends stimulus ({wt.min}–{wt.max} stimulating
            reps/week per muscle for this goal), fatigue management, the
            stimulus-to-fatigue ratio, frequency, goal specificity and how
            sustainable the sessions are.
          </p>
        </InfoNote>
      </Card>

      {/* Plan summary */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{days} days / week</Badge>
        <Badge tone="neutral">{plan.splitLabel}</Badge>
        {plan.splitPattern && <Badge tone="neutral">{plan.splitPattern}</Badge>}
        <Badge tone="neutral">{GOALS.find((g) => g.key === goal)?.label}</Badge>
        <Badge tone="neutral">{EQUIPMENT.find((e) => e.key === equipment)?.label}</Badge>
        {!isEndurance && <Badge tone="neutral">every muscle {plan.minFrequency}×/week</Badge>}
      </div>

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
                  {day.exercises.map((ex, j) => {
                    // Cardio & plyo rows show a single prescription spanning the
                    // sets/load columns, with an icon to set them apart.
                    if (ex.kind !== "lift") {
                      return (
                        <tr key={j} className="border-t border-zinc-100 dark:border-zinc-800">
                          <td className="px-3 py-2 font-medium">
                            <span className="mr-1">{ex.kind === "plyo" ? "⚡" : "🫀"}</span>
                            {ex.name}
                          </td>
                          <td className="px-3 py-2 text-zinc-500" colSpan={2}>
                            {ex.prescription}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={j} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2 font-medium">
                          {ex.name}
                          {ex.lengthened && (
                            <span
                              className="ml-1 text-accent-500"
                              title="Loads the muscle at long lengths — more growth per set"
                            >
                              ⤢
                            </span>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly volume & stimulating reps per muscle */}
      {!isEndurance && plan.volume.length > 0 && (
        <Card>
          <CardTitle>Weekly volume &amp; stimulating reps</CardTitle>
          <p className="mb-3 text-sm text-zinc-500">
            {vt.label}. The bar is stimulating reps — the number that tracks
            growth — against a {wt.min}–{wt.max} target for this goal.
          </p>
          <div className="space-y-2">
            {rating.perMuscle.map((v) => {
              const tone =
                v.verdict === "under" ? "#f59e0b" : v.verdict === "excess" ? "#ef4444" : "#10b981";
              return (
                <div key={v.muscle}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="font-medium">{v.muscle}</span>
                    <span className="text-zinc-400">
                      {Math.round(v.wns)} stim reps · {fmt(v.sets, 1)} sets · {v.frequency}×/week
                      {v.verdict !== "in range" && (
                        <span className="ml-1 text-amber-500">
                          {v.verdict === "under" ? "below target" : "past the useful dose"}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (v.wns / (wt.max * 1.3)) * 100)}%`,
                        backgroundColor: tone,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Sets count assisting movers as half. Frequency is the rolling weekly
            average, so a session type run three times in two weeks reads as
            1.5×.
          </p>
        </Card>
      )}

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
