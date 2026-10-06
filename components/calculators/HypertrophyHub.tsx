"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Card, CardTitle, Field, NumberInput, Select, SegmentedControl, Button, InfoNote } from "../ui";
import BodyMap, { VERDICT_SWATCH } from "../BodyMap";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField, useHeightField } from "@/lib/profile";
import { ACTIVITY_LEVELS, TRAINING_LEVELS, e1rmFromSet } from "@/lib/formulas";
import { EXERCISES, EXERCISE_BY_ID, EXERCISE_CATEGORIES, MUSCLE_BY_ID, MUSCLE_REGIONS, type MuscleId } from "@/lib/exercises";
import { rateRoutine, routineFromTemplate, type Routine } from "@/lib/routine";
import { physiquePlan, type PhysiqueGoal } from "@/lib/physique";
import {
  FEATURED_LIFTS,
  VERDICT_LABEL,
  ordinal,
  estimateLift,
  forecastPhysique,
  type HubContext,
  type LiftEntry,
  type MuscleVerdict,
} from "@/lib/hub";
import { weightFromKg, weightToKg, weightUnit, lengthUnit, fmt } from "@/lib/units";
import { goToTool } from "@/lib/nav";

interface HubState {
  horizon: number;
  goal: PhysiqueGoal;
  activity: string;
  routineId: string | null;
  lifts: LiftEntry[];
}

const DEFAULT_HUB: HubState = { horizon: 6, goal: "build", activity: "moderate", routineId: null, lifts: [] };

interface RoutineStore {
  routines: Routine[];
  activeId: string;
}

const newId = () => Math.random().toString(36).slice(2, 10);

/** Profile lift keys the hub keeps in sync with logged lifts. */
const PROFILE_SYNC: Record<string, "bench" | "squat" | "deadlift" | "ohp"> = {
  "bench-press": "bench",
  squat: "squat",
  deadlift: "deadlift",
  ohp: "ohp",
};

export default function HypertrophyHub() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);
  const { profile, patch, patchLifts } = useProfile();
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);

  const [hub, setHub, hubHydrated] = useLocalStorage<HubState>("vital.hub", DEFAULT_HUB);
  const fallbackStore = useMemo<RoutineStore>(() => {
    const r = routineFromTemplate("full-body", "My routine");
    return { routines: [r], activeId: r.id };
  }, []);
  const [routineStore] = useLocalStorage<RoutineStore>("vital.routines", fallbackStore);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const set = (p: Partial<HubState>) => setHub((h) => ({ ...DEFAULT_HUB, ...h, ...p }));
  const state = { ...DEFAULT_HUB, ...hub };

  const routine =
    routineStore.routines.find((r) => r.id === state.routineId) ??
    routineStore.routines.find((r) => r.id === routineStore.activeId) ??
    routineStore.routines[0] ??
    null;
  const rating = useMemo(() => (routine ? rateRoutine(routine) : null), [routine]);

  const activityMultiplier = ACTIVITY_LEVELS.find((a) => a.key === state.activity)?.multiplier ?? 1.55;
  const ctx: HubContext = {
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    bodyFatPct: profile.bodyFatPct,
    level: profile.experience,
    goal: state.goal,
    rating,
  };
  const weeks = Math.round(state.horizon * 4.345);
  const plan = physiquePlan({
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct,
    level: profile.experience,
    activityMultiplier,
    goal: state.goal,
    cutRatePct: 0.75,
    weeks,
  });
  const lifts = state.lifts.map((l) => estimateLift(l, ctx, state.horizon));
  const forecast = forecastPhysique({ ctx, plan, months: state.horizon, lifts });

  // Keep the shared profile's big-four 1RMs in sync with logged lifts.
  useEffect(() => {
    if (!hubHydrated) return;
    const updates: Partial<Record<"bench" | "squat" | "deadlift" | "ohp", number>> = {};
    for (const l of state.lifts) {
      const key = PROFILE_SYNC[l.exerciseId];
      if (!key) continue;
      const e = Math.round(e1rmFromSet(l.weightKg, l.reps, l.rir) * 10) / 10;
      if (e > 0 && Math.abs((profile.lifts[key] ?? 0) - e) > 0.05) updates[key] = e;
    }
    if (Object.keys(updates).length) patchLifts(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubHydrated, state.lifts]);

  const w = (kg: number, d = 1) => fmt(weightFromKg(kg, units), d);
  const signed = (kg: number, d = 1) => `${kg >= 0.05 ? "+" : kg <= -0.05 ? "−" : ""}${w(Math.abs(kg), d)}`;

  const addLift = (exerciseId: string) => {
    const ex = EXERCISE_BY_ID[exerciseId];
    const bw = ["pull-up", "chin-up", "dips", "triceps-dip"].includes(exerciseId);
    const fromProfile = PROFILE_SYNC[exerciseId] ? profile.lifts[PROFILE_SYNC[exerciseId]] : 0;
    const weightKg = bw ? 0 : fromProfile > 0 ? Math.round(fromProfile * 0.85) : ex?.fatigue && ex.fatigue >= 1 ? 60 : 20;
    set({ lifts: [...state.lifts, { id: newId(), exerciseId, weightKg, reps: fromProfile > 0 ? 5 : 8, rir: 1 }] });
  };
  const updateLift = (id: string, p: Partial<LiftEntry>) =>
    set({ lifts: state.lifts.map((l) => (l.id === id ? { ...l, ...p } : l)) });
  const removeLift = (id: string) => set({ lifts: state.lifts.filter((l) => l.id !== id) });

  const verdicts = Object.fromEntries(forecast.muscles.map((m) => [m.muscle, m.verdict])) as Record<MuscleId, MuscleVerdict>;
  const titles = Object.fromEntries(
    forecast.muscles.map((m) => [m.muscle, `${m.name}: ${VERDICT_LABEL[m.verdict]}. ${m.note}`])
  ) as Record<MuscleId, string>;
  const flagged = forecast.muscles.filter((m) => m.verdict === "under-trained" || m.verdict === "lagging");
  const flaggedMajor = flagged.filter((m) => MUSCLE_BY_ID[m.muscle].weight >= 0.5 || m.verdict === "lagging");
  const flaggedMinor = flagged.filter((m) => !flaggedMajor.includes(m));
  const sel = forecast.muscles.find((m) => m.muscle === selected) ?? null;
  const benchLike = lifts.find((l) => l.entry.exerciseId === "bench-press") ?? lifts[0];

  // Priority actions: the most important things to change, from every section.
  const actions: { tone: "bad" | "warn" | "good"; text: string; tool?: string }[] = [];
  if (!rating || rating.score === 0) actions.push({ tone: "bad", text: "Build or pick a training routine. Without one, the forecast can't tell which muscles will grow.", tool: "routine-planner" });
  for (const f of rating?.feedback.filter((x) => x.tone !== "good").slice(0, 3) ?? []) actions.push({ tone: f.tone, text: f.text, tool: "routine-planner" });
  for (const m of flagged.filter((m) => m.verdict === "lagging").slice(0, 2)) actions.push({ tone: "warn", text: `${m.name} is lagging. ${m.note}` });
  for (const i of forecast.insights.slice(0, 2)) actions.push({ tone: "warn", text: i });
  if (state.lifts.length === 0) actions.push({ tone: "warn", text: "Log a few lifts below to get strength forecasts and spot lagging muscles from your strength." });
  if (actions.length === 0) actions.push({ tone: "good", text: "No red flags: your training, nutrition and balance all line up. Keep progressing your lifts." });

  return (
    <div className="space-y-6">
      {/* ---- Hero: the forecast in numbers ---- */}
      <section className="overflow-hidden rounded-xl bg-zinc-900 p-5 text-white sm:p-7 dark:bg-zinc-950 dark:ring-1 dark:ring-[var(--line)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="swiss-label text-accent-400">Forecast</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your next {state.horizon} months
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <DarkToggle
              value={state.goal}
              onChange={(v) => set({ goal: v as PhysiqueGoal })}
              options={[
                { value: "build", label: "Build" },
                { value: "recomp", label: "Recomp" },
                { value: "cut", label: "Cut" },
              ]}
            />
            <DarkToggle
              value={String(state.horizon)}
              onChange={(v) => set({ horizon: Number(v) })}
              options={[
                { value: "3", label: "3 mo" },
                { value: "6", label: "6 mo" },
                { value: "12", label: "12 mo" },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/10 lg:grid-cols-5">
          <Kpi
            label="Muscle"
            value={`${signed(forecast.leanGainKg)} ${wu}`}
            sub={
              forecast.potentialLeanGainKg > 0
                ? `${Math.round((forecast.leanGainKg / forecast.potentialLeanGainKg) * 100)}% of your potential`
                : "lean mass change"
            }
            accent
          />
          <Kpi label="Bodyweight" value={`${w(forecast.now.weightKg)} → ${w(forecast.then.weightKg)}`} sub={wu} />
          <Kpi label="Body fat" value={`${fmt(forecast.now.bodyFatPct, 1)} → ${fmt(forecast.then.bodyFatPct, 1)}%`} sub={state.goal === "cut" ? "cutting" : state.goal === "recomp" ? "recomposition" : "no planned fat gain"} />
          <Kpi label="FFMI" value={`${fmt(forecast.now.ffmi, 1)} → ${fmt(forecast.then.ffmi, 1)}`} sub={forecast.then.ffmiLabel} />
          <Kpi
            label={benchLike ? benchLike.name : "Routine"}
            value={
              benchLike
                ? `${w(benchLike.e1rm, 0)} → ${w(benchLike.forecast[state.horizon], 0)}`
                : rating
                  ? `${rating.grade} · ${rating.score}`
                  : "—"
            }
            sub={benchLike ? `${wu} est. 1RM` : "routine score"}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/60">
          Estimates from group averages for a {profile.age}-year-old {profile.experience} {profile.sex === "male" ? "man" : "woman"}. Individual
          response varies a lot: some people gain twice the average, some half.
        </p>
      </section>

      {/* ---- Priority actions ---- */}
      <Card>
        <CardTitle>What to do next</CardTitle>
        <ol className="grid gap-3 md:grid-cols-2">
          {actions.slice(0, 6).map((a, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold text-white " +
                  (a.tone === "bad" ? "bg-red-700" : a.tone === "warn" ? "bg-amber-600" : "bg-emerald-600")
                }
              >
                {i + 1}
              </span>
              <span>
                {a.text}
                {a.tool && (
                  <button type="button" onClick={() => goToTool(a.tool!)} className="ml-1 font-semibold text-accent-600 underline underline-offset-2 dark:text-accent-400">
                    Fix it
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ---- 01 You ---- */}
        <Card>
          <CardTitle>01 — You</CardTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Age">
              <NumberInput value={profile.age} onChange={(v) => patch({ age: v })} min={14} max={90} suffix="y" />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={profile.sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ]}
              />
            </Field>
            <Field label="Height">
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
            <Field label="Bodyweight">
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label="Body fat">
              <NumberInput value={profile.bodyFatPct} onChange={(v) => patch({ bodyFatPct: v })} min={3} max={60} suffix="%" />
            </Field>
            <Field label="Training age">
              <Select
                value={profile.experience}
                onChange={(v) => patch({ experience: v })}
                options={TRAINING_LEVELS.map((t) => ({ value: t.key, label: `${t.label} · ${t.years}` }))}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Daily activity" hint="including training">
              <Select value={state.activity} onChange={(v) => set({ activity: v })} options={ACTIVITY_LEVELS.map((a) => ({ value: a.key, label: a.label }))} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Synced with <strong>Your stats</strong>: change it here or in the sidebar, and every tool updates.
          </p>
        </Card>

        {/* ---- 02 Nutrition ---- */}
        <Card>
          <CardTitle>02 — Nutrition</CardTitle>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="swiss-label text-accent-600 dark:text-accent-400">Daily calories</div>
              <div className="text-5xl font-bold tabular-nums tracking-tight">{fmt(plan.calories, 0)}</div>
            </div>
            <div className="pb-1 text-sm text-zinc-600 dark:text-zinc-400">
              maintenance {fmt(plan.tdee, 0)} · {plan.deltaKcal >= 0 ? "+" : "−"}
              {fmt(Math.abs(plan.deltaKcal), 0)} kcal/day
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MacroBar label="Protein" g={plan.proteinG} kcal={plan.proteinG * 4} total={plan.calories} sub={`${plan.proteinPerKg} g/kg`} />
            <MacroBar label="Carbs" g={plan.carbsG} kcal={plan.carbsG * 4} total={plan.calories} />
            <MacroBar label="Fat" g={plan.fatG} kcal={plan.fatG * 9} total={plan.calories} />
          </div>
          <ul className="mt-5 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              Scale: <strong>{signed(plan.weightPerWeekKg * 4.345, 2)} {wu}/month</strong>
              {state.goal === "build" && " (just the muscle; adjust ±100 kcal if it drifts)"}
            </li>
            <li>
              Protein per meal: <strong>~{fmt(plan.proteinG / 4, 0)} g</strong> × 4 meals (≈0.4 g/kg each)
            </li>
            <li>
              Max muscle rate: <strong>{w(plan.maxLeanPerWeekKg * 4.345, 2)} {wu}/month</strong> for your training age
            </li>
          </ul>
          <button type="button" onClick={() => goToTool("diet-planner")} className="mt-4 text-sm font-semibold text-accent-600 underline underline-offset-4 dark:text-accent-400">
            Open the full nutrition planner →
          </button>
        </Card>
      </div>

      {/* ---- 03 Lifts ---- */}
      <Card>
        <CardTitle>03 — Lifts &amp; progression</CardTitle>
        {lifts.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Log a recent hard set for your main lifts. You&apos;ll get an estimated 1RM, your strength level, a{" "}
            {state.horizon}-month forecast and a next-session target. Your lifts also reveal which muscles are lagging.
          </p>
        ) : (
          <div className="mb-4">
            <div className="swiss-label hidden grid-cols-[minmax(0,1.6fr)_6.5rem_4.5rem_6.5rem_6rem_8rem_9.5rem_2rem] gap-3 border-b border-[var(--line-strong)] pb-2 text-zinc-600 md:grid dark:text-zinc-400">
              <span>Exercise</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RIR</span>
              <span className="text-right">Est. 1RM</span>
              <span>Level</span>
              <span>In {state.horizon} mo</span>
              <span />
            </div>
            {lifts.map((l) => {
              const bw = ["pull-up", "chin-up", "dips", "triceps-dip"].includes(l.entry.exerciseId);
              const end = l.forecast[state.horizon];
              const plus = (v: number) => (bw && v >= 0 ? "+" : "");
              return (
                <div
                  key={l.entry.id}
                  className="grid grid-cols-3 gap-x-3 gap-y-2 border-b border-[var(--line)] py-3 md:grid-cols-[minmax(0,1.6fr)_6.5rem_4.5rem_6.5rem_6rem_8rem_9.5rem_2rem] md:items-start"
                >
                  <div className="col-span-3 flex gap-2 md:col-span-1 md:block">
                    <div className="min-w-0 flex-1">
                      <select
                        aria-label="Exercise"
                        value={l.entry.exerciseId}
                        onChange={(e) => updateLift(l.entry.id, { exerciseId: e.target.value })}
                        className="field w-full rounded-lg px-2.5 py-2.5 text-sm outline-none"
                      >
                        {EXERCISE_CATEGORIES.map((c) => (
                          <optgroup key={c} label={c}>
                            {EXERCISES.filter((x) => x.category === c).map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div className="mt-1 text-xs text-zinc-500">Next: {l.next}</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove lift"
                      onClick={() => removeLift(l.entry.id)}
                      className="btn h-[42px] w-9 shrink-0 rounded-lg text-zinc-600 md:hidden dark:text-zinc-300"
                    >
                      ×
                    </button>
                  </div>
                  <NumberInput
                    value={Number(weightFromKg(l.entry.weightKg, units).toFixed(1))}
                    onChange={(v) => updateLift(l.entry.id, { weightKg: weightToKg(v, units) })}
                    suffix={bw ? `+${wu}` : wu}
                  />
                  <NumberInput value={l.entry.reps} onChange={(v) => updateLift(l.entry.id, { reps: Math.round(v) })} min={1} max={50} suffix="reps" />
                  <Select
                    value={String(l.entry.rir)}
                    onChange={(v) => updateLift(l.entry.id, { rir: Number(v) })}
                    options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? "Failure" : `${n} RIR` }))}
                  />
                  <div className="md:text-right">
                    <div className="text-xs text-zinc-500 md:hidden">Est. 1RM</div>
                    <div className="text-lg font-bold tabular-nums">
                      {plus(l.e1rm)}
                      {w(l.e1rm, 1)} <span className="text-xs font-normal text-zinc-500">{wu}</span>
                    </div>
                  </div>
                  <div>
                    {l.level ? (
                      <>
                        <div className="font-semibold">{l.level}</div>
                        <div className="text-xs text-zinc-500">{ordinal(l.percentile ?? 0)} percentile</div>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500">No standard</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-14 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={l.forecast.map((v, i) => ({ i, v }))}>
                          <Line type="monotone" dataKey="v" stroke="#e1301f" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="font-semibold tabular-nums">
                        {plus(end)}
                        {w(end, 1)}
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        {(() => {
                          // Bodyweight lifts: % of the total load moved, not of the added weight.
                          const base = bw ? l.e1rm + profile.weightKg : l.e1rm;
                          return base > 0 ? `+${fmt(((end - l.e1rm) / base) * 100, 0)}%` : "";
                        })()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove lift"
                    onClick={() => removeLift(l.entry.id)}
                    className="btn hidden h-9 w-8 rounded-lg text-zinc-600 md:block dark:text-zinc-300"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="swiss-label mr-1 text-zinc-500">Add</span>
          {FEATURED_LIFTS.filter((id) => !state.lifts.some((l) => l.exerciseId === id)).map((id) => (
            <button key={id} type="button" onClick={() => addLift(id)} className="btn rounded-lg px-3 py-1.5 text-sm font-medium">
              + {EXERCISE_BY_ID[id]?.name}
            </button>
          ))}
        </div>
        <InfoNote>
          <p>
            Est. 1RM counts reps in reserve as reps you could have done, then averages Epley and Brzycki (Epley alone past
            10 reps). Levels compare you with lifters of your sex, age and bodyweight; variations (incline, dumbbells, RDL)
            are converted to their base lift first, so treat those as approximate.
          </p>
          <p>
            Forecasts approach a natural ceiling (just above the elite standard): starting monthly gains of ~4% for
            beginners, ~1.2% intermediate and ~0.5% advanced, scaled by how well your routine trains the lift&apos;s
            muscles and by your diet (a cut slows strength gains). Next-session targets use double progression: add a
            rep each session, then add load.
          </p>
        </InfoNote>
      </Card>

      {/* ---- 04 Physique forecast ---- */}
      <Card>
        <CardTitle>04 — Physique in {state.horizon} months</CardTitle>
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div>
            <BodyMap verdicts={verdicts} titles={titles} selected={selected} onSelect={setSelected} />
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
              {(["under-trained", "lagging", "on-track", "growing-fast"] as MuscleVerdict[]).map((v) => (
                <span key={v} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 border border-[var(--line)]" style={{ background: VERDICT_SWATCH[v] }} />
                  {v === "growing-fast" ? "Growing fast / strong" : VERDICT_LABEL[v]}
                </span>
              ))}
            </div>
            <div className="well mt-4 min-h-24 rounded-lg p-3 text-sm">
              {sel ? (
                <>
                  <div className="font-semibold">
                    {sel.name} · {VERDICT_LABEL[sel.verdict]}
                  </div>
                  <div className="text-xs text-zinc-500">{MUSCLE_BY_ID[sel.muscle].detail}</div>
                  <p className="mt-1.5 leading-relaxed">{sel.note}</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Projected muscle mass: {sel.growthPct >= 0 ? "+" : ""}
                    {fmt(sel.growthPct, 1)}% ({signed(sel.gainKg, 2)} {wu})
                  </p>
                </>
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">Tap a muscle for its forecast.</p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {flagged.length > 0 && (
              <div className="border-l-4 border-accent-500 pl-4">
                <div className="swiss-label mb-1.5 text-accent-600 dark:text-accent-400">Needs attention</div>
                <ul className="space-y-1.5 text-sm">
                  {flaggedMajor.map((m) => (
                    <li key={m.muscle}>
                      <strong>{m.name}</strong> — {VERDICT_LABEL[m.verdict].toLowerCase()}. {m.note}
                    </li>
                  ))}
                  {flaggedMinor.length > 0 && (
                    <li className="text-zinc-600 dark:text-zinc-400">
                      Also barely trained (smaller muscles, optional):{" "}
                      {flaggedMinor.map((m) => m.name.toLowerCase()).join(", ")}.
                    </li>
                  )}
                </ul>
              </div>
            )}
            {forecast.insights.length > 0 && (
              <div>
                <div className="swiss-label mb-1.5 text-zinc-500">Proportions</div>
                <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {forecast.insights.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="swiss-label mb-2 text-zinc-500">Projected change in muscle mass</div>
              <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                {MUSCLE_REGIONS.map((region) => (
                  <div key={region} className="mb-3">
                    <div className="swiss-label mb-1 border-b border-[var(--line-strong)] pb-1 text-zinc-900 dark:text-zinc-100">{region}</div>
                    {forecast.muscles
                      .filter((m) => MUSCLE_BY_ID[m.muscle].region === region)
                      .map((m) => {
                        const max = Math.max(...forecast.muscles.map((x) => Math.abs(x.growthPct)), 1);
                        return (
                          <button
                            key={m.muscle}
                            type="button"
                            onClick={() => setSelected(m.muscle)}
                            className={"flex w-full items-center gap-2 py-1 text-left text-sm " + (selected === m.muscle ? "font-semibold" : "")}
                          >
                            <span className="w-24 shrink-0 truncate">{m.name}</span>
                            <span className="block h-2 min-w-12 flex-1 bg-zinc-200 dark:bg-zinc-700">
                              <span
                                className="block h-full"
                                style={{ width: `${(Math.abs(m.growthPct) / max) * 100}%`, background: VERDICT_SWATCH[m.verdict] === "transparent" ? "#c4c4c0" : VERDICT_SWATCH[m.verdict] }}
                              />
                            </span>
                            <span className="w-14 shrink-0 text-right text-xs tabular-nums">
                              {m.growthPct >= 0 ? "+" : ""}
                              {fmt(m.growthPct, 1)}%
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <InfoNote>
          <p>
            Total muscle gain comes from the nutrition model (your training age, sex, age and goal), scaled by how well your
            routine trains each muscle: an untrained muscle doesn&apos;t grow however much you eat. It&apos;s split across
            muscles by their size and their weekly effective sets (evidence-based routine score).
          </p>
          <p>
            &quot;Lagging&quot; and &quot;strong point&quot; compare the strength of the lifts that train each muscle with
            your average across lifts, so they need logged lifts. Muscle-mass change is not the same as visible size: a 6%
            gain in muscle mass is roughly a 2% gain in limb circumference. About 60% of lean-mass gain is muscle itself;
            the rest is water, glycogen and connective tissue.
          </p>
        </InfoNote>
      </Card>

      {/* ---- 05 Training ---- */}
      <Card>
        <CardTitle>05 — Training plan</CardTitle>
        {routine && rating ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Field label="Routine">
                <Select
                  value={routine.id}
                  onChange={(id) => set({ routineId: id })}
                  options={routineStore.routines.map((r) => ({ value: r.id, label: r.name || "Untitled routine" }))}
                />
              </Field>
              <div className="mt-4 flex items-stretch gap-4">
                <div className="flex w-20 items-center justify-center bg-zinc-900 text-4xl font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {rating.grade}
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">
                    {rating.score}
                    <span className="ml-1 text-base font-medium text-zinc-500">/ 100</span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Evidence score · Beardsley WNS {rating.scores.wns}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {rating.workoutsPerWeek} workouts · {rating.weeklySets} sets a week
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => goToTool("routine-planner")}>
                Edit in Routine planner →
              </Button>
            </div>
            <div>
              <div className="swiss-label mb-2 text-zinc-500">Weekly effective sets per muscle</div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {rating.muscles.map((m) => (
                  <div key={m.muscle} className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 truncate">{m.name}</span>
                    <span className="relative h-2 flex-1 bg-zinc-200 dark:bg-zinc-700">
                      <span
                        className={"absolute inset-y-0 left-0 " + (m.creditedSets >= 10 ? "bg-accent-500" : "bg-zinc-800 dark:bg-zinc-200")}
                        style={{ width: `${Math.min(100, (m.creditedSets / 20) * 100)}%` }}
                      />
                      <span className="absolute inset-y-[-3px] left-1/2 w-px bg-zinc-500" title="10 sets" />
                    </span>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums">{fmt(m.creditedSets, 1)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Marker at 10 sets/week, the low end of the evidence-based target range (10–20).</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No routine yet.</p>
            <Button onClick={() => goToTool("routine-planner")}>Build a routine</Button>
          </div>
        )}
      </Card>

      {/* ---- 06 Evidence essentials ---- */}
      <section>
        <h2 className="swiss-label mb-3 border-b border-[var(--line-strong)] pb-1.5 text-zinc-900 dark:text-zinc-100">
          06 — What actually builds muscle
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ESSENTIALS.map((e) => (
            <div key={e.title} className="panel rounded-xl p-4">
              <div className="text-3xl font-bold tracking-tight text-accent-600 dark:text-accent-400">{e.big}</div>
              <div className="mt-1 font-semibold">{e.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{e.text}</p>
              <p className="mt-2 text-xs text-zinc-500">{e.source}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const ESSENTIALS = [
  {
    big: "10–20",
    title: "Hard sets per muscle per week",
    text: "Growth rises with weekly volume, with diminishing returns. Most people do best somewhere in this range; past ~10 sets in one session, extra sets add little.",
    source: "Schoenfeld 2017; Pelland et al. meta-regressions",
  },
  {
    big: "0–3",
    title: "Reps in reserve",
    text: "Sets need to be hard, but not necessarily to failure. Growth drops only modestly up to 2–3 reps in reserve, then faster.",
    source: "Robinson et al. 2024; Refalo et al. 2023",
  },
  {
    big: "5–30",
    title: "Reps per set",
    text: "Heavy and light loads build similar muscle when taken close to failure. Pick the rep range that lets you train hard safely.",
    source: "Schoenfeld et al. 2017 (loading meta-analysis)",
  },
  {
    big: "2×",
    title: "Per muscle per week",
    text: "Frequency matters little once weekly volume is equal, but splitting volume over 2+ sessions keeps every set high quality.",
    source: "Schoenfeld et al. 2019",
  },
  {
    big: "1.6",
    title: "g protein per kg a day",
    text: "Gains plateau around 1.6 g/kg (up to ~2.2 to be safe), spread over 3–5 meals of ~0.4 g/kg.",
    source: "Morton et al. 2018",
  },
  {
    big: "+50",
    title: "kcal a day is enough",
    text: "Building muscle costs little energy. A small surplus builds the same muscle as a big one, which mainly adds fat.",
    source: "Helms et al. 2023; Slater et al. 2019",
  },
  {
    big: "Stretch",
    title: "Train long muscle lengths",
    text: "Exercises that load the muscle in its stretched position (seated leg curls, incline curls, deep squats) tend to build more muscle.",
    source: "Maeo et al. 2021; Pedrosa et al. 2022",
  },
  {
    big: "7–9 h",
    title: "Sleep",
    text: "Poor sleep lowers muscle protein synthesis and recovery. It's the cheapest performance enhancer there is.",
    source: "Lamon et al. 2021",
  },
];

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 p-4 dark:bg-zinc-950">
      <div className="swiss-label truncate text-white/60">{label}</div>
      <div className={"mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl " + (accent ? "text-accent-400" : "")}>{value}</div>
      <div className="mt-0.5 truncate text-xs text-white/60">{sub}</div>
    </div>
  );
}

function DarkToggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div role="group" className="inline-flex rounded-lg bg-white/10 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "rounded-md px-3 py-1.5 text-sm font-semibold transition " +
            (value === o.value ? "bg-white text-zinc-900" : "text-white/70 hover:text-white")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MacroBar({ label, g, kcal, total, sub }: { label: string; g: number; kcal: number; total: number; sub?: string }) {
  const pct = total > 0 ? (kcal / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-zinc-600 dark:text-zinc-400">
        <span>{label}</span>
        <span>{fmt(pct, 0)}%</span>
      </div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">
        {fmt(g, 0)}
        <span className="ml-0.5 text-sm font-medium text-zinc-500">g</span>
      </div>
      <div className="mt-1 h-1.5 bg-zinc-200 dark:bg-zinc-700">
        <div className="h-full bg-accent-500" style={{ width: `${pct}%` }} />
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
