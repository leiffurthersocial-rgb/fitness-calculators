"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle, Field, NumberInput, Select, SegmentedControl, Result, Stat, InfoNote, Tip } from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import { ACTIVITY_LEVELS } from "@/lib/formulas";
import { physiquePlan, compareStrategies, FAT_KCAL, LEAN_GAIN_KCAL, type PhysiqueGoal } from "@/lib/physique";
import { weightFromKg, weightUnit, fmt } from "@/lib/units";

const EXTRA_OPTIONS = [
  { value: "0", label: "None — muscle only (recommended)" },
  { value: "100", label: "+100 kcal buffer" },
  { value: "250", label: "+250 kcal" },
  { value: "500", label: "+500 kcal (classic bulk)" },
];
const CUT_RATES = [
  { value: "0.5", label: "Slow · 0.5%/wk (best muscle retention)" },
  { value: "0.75", label: "Moderate · 0.75%/wk" },
  { value: "1", label: "Fast · 1%/wk" },
];
const WEEKS = [
  { value: "8", label: "8 wk" },
  { value: "12", label: "12 wk" },
  { value: "16", label: "16 wk" },
  { value: "24", label: "24 wk" },
];

export default function DietPlanner() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile } = useProfile();

  const [goal, setGoal] = useState<PhysiqueGoal>("build");
  const [activity, setActivity] = useState("moderate");
  const [extra, setExtra] = useState("0");
  const [cutRate, setCutRate] = useState("0.75");
  const [targetBf, setTargetBf] = useState(12);
  const [weeks, setWeeks] = useState("16");

  const activityMultiplier = ACTIVITY_LEVELS.find((a) => a.key === activity)?.multiplier ?? 1.55;
  const base = {
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct,
    level: profile.experience,
    activityMultiplier,
    weeks: Number(weeks),
  };
  const plan = physiquePlan({
    ...base,
    goal,
    extraSurplus: Number(extra),
    cutRatePct: Number(cutRate),
    targetBodyFatPct: goal === "cut" ? targetBf : undefined,
  });
  const strategies = compareStrategies(base);
  const currentKey =
    goal === "cut"
      ? cutRate === "0.75" ? "cut" : ""
      : goal === "recomp"
        ? "recomp"
        : extra === "0" ? "muscle" : extra === "500" ? "bulk" : "";

  const w = (kg: number, d = 1) => fmt(weightFromKg(kg, units), d);
  const signedW = (kg: number, d = 1) => `${kg > 0.005 ? "+" : kg < -0.005 ? "−" : ""}${w(Math.abs(kg), d)}`;
  const signedKcal = (k: number) => `${k > 0.5 ? "+" : k < -0.5 ? "−" : "±"}${fmt(Math.abs(k), 0)}`;

  const chartData = plan.trajectory.map((t) => ({
    week: t.week,
    muscle: Number(weightFromKg(t.leanKg - plan.trajectory[0].leanKg, units).toFixed(2)),
    fat: Number(weightFromKg(t.fatKg - plan.trajectory[0].fatKg, units).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* ---- Inputs ---- */}
        <Card>
          <CardTitle>01 — Your goal</CardTitle>
          <div className="space-y-4">
            <Field label="Goal">
              <SegmentedControl
                value={goal}
                onChange={setGoal}
                options={[
                  { value: "build", label: "Build muscle" },
                  { value: "recomp", label: "Recomp" },
                  { value: "cut", label: "Cut fat" },
                ]}
              />
            </Field>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {goal === "build" &&
                "Eat just enough extra to pay for the muscle you can actually build. Growth is limited by training, not calories, so more food mostly adds fat."}
              {goal === "recomp" &&
                "Eat at maintenance with high protein and train hard: build some muscle while slowly losing fat. Works best for beginners, people returning to training, and those with more body fat."}
              {goal === "cut" &&
                "Lose fat while keeping muscle: a moderate deficit, high protein and the same hard training."}
            </p>
            <Field label="Activity level" hint="outside the gym + training">
              <Select
                value={activity}
                onChange={setActivity}
                options={ACTIVITY_LEVELS.map((a) => ({ value: a.key, label: a.label }))}
              />
            </Field>
            {goal === "build" && (
              <Field label="Extra on top of the muscle surplus" hint="adds fat, not muscle">
                <Select value={extra} onChange={setExtra} options={EXTRA_OPTIONS} />
              </Field>
            )}
            {goal === "cut" && (
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <Field label="Pace">
                  <Select value={cutRate} onChange={setCutRate} options={CUT_RATES} />
                </Field>
                <Field label="Target body fat">
                  <NumberInput value={targetBf} onChange={setTargetBf} min={3} max={50} suffix="%" />
                </Field>
              </div>
            )}
            <Field label="Projection">
              <SegmentedControl value={weeks} onChange={setWeeks} options={WEEKS} />
            </Field>
            <Tip>
              Uses <strong>Your stats</strong> from the sidebar: {profile.sex === "male" ? "male" : "female"},{" "}
              {profile.age} y, {w(profile.weightKg)} {wu}, {fmt(profile.bodyFatPct)}% body fat,{" "}
              {profile.experience} lifter. Training experience sets how fast you can build muscle.
            </Tip>
          </div>
        </Card>

        {/* ---- Targets ---- */}
        <Card>
          <CardTitle>02 — Daily targets</CardTitle>
          <div className="space-y-4">
            <Result
              label="Daily calories"
              value={fmt(plan.calories, 0)}
              unit="kcal"
              sub={`Maintenance ${fmt(plan.tdee, 0)} kcal · ${signedKcal(plan.deltaKcal)} kcal/day`}
            />
            <div className="grid grid-cols-3 gap-3">
              <Stat label={`Protein (${plan.proteinPerKg} g/kg)`} value={fmt(plan.proteinG, 0)} unit="g" />
              <Stat label="Carbs" value={fmt(plan.carbsG, 0)} unit="g" />
              <Stat label="Fat" value={fmt(plan.fatG, 0)} unit="g" />
            </div>

            <div>
              <div className="swiss-label mb-2 text-zinc-500">After {weeks} weeks</div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Muscle" value={signedW(plan.totals.leanKg)} unit={wu} />
                <Stat label="Fat" value={signedW(plan.totals.fatKg)} unit={wu} />
                <Stat label="Scale weight" value={signedW(plan.totals.weightKg)} unit={wu} />
              </div>
            </div>

            {goal === "build" && (
              <Tip>
                Your muscle can grow by about {w(plan.maxLeanPerWeekKg * 4.345, 2)} {wu} a month, which costs
                only ~{fmt(plan.muscleOnlySurplus, 0)} kcal/day. Expect the scale to rise about{" "}
                {w(plan.weightPerWeekKg * 4.345, 2)} {wu}/month. If it climbs faster for 3–4 weeks, cut 100 kcal;
                if it doesn&apos;t move at all, add 100.
              </Tip>
            )}
            {goal === "recomp" && (
              <Tip>
                The scale will barely move ({signedW(plan.weightPerWeekKg * 4.345, 2)} {wu}/month), so judge
                progress by waist measurement, photos and rising strength, not weight.
              </Tip>
            )}
            {goal === "cut" && (
              <Tip>
                {plan.weeksToTargetBf != null
                  ? `Reach ${fmt(targetBf)}% body fat in about ${plan.weeksToTargetBf} weeks. `
                  : "You're already at or below that body-fat target. "}
                Keep training as heavy and hard as before. That&apos;s the signal to keep muscle. Recalculate every
                4 weeks as your maintenance drops.
              </Tip>
            )}
          </div>
        </Card>
      </div>

      {/* ---- Projection chart ---- */}
      <Card>
        <CardTitle>03 — Muscle vs fat over {weeks} weeks</CardTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="#8b929c33" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#8b929c" }} tickLine={false} axisLine={false} label={{ value: "week", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#8b929c" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8b929c" }} tickLine={false} axisLine={false} unit={` ${wu}`} width={64} />
              <ReferenceLine y={0} stroke="#8b929c" />
              <Tooltip
                formatter={(v, name) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)} ${wu}`, name === "muscle" ? "Muscle" : "Fat"]}
                labelFormatter={(l) => `Week ${l}`}
                contentStyle={{ borderRadius: 8, border: "none", background: "#1c1e22", color: "#fff", fontSize: 12 }}
              />
              <Legend formatter={(v) => (v === "muscle" ? "Muscle" : "Fat")} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="muscle" stroke="#e1301f" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="fat" stroke="#8b929c" strokeWidth={2.5} dot={false} strokeDasharray="6 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ---- Strategy comparison ---- */}
      <Card>
        <CardTitle>04 — Same {weeks} weeks, different calories</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--line-strong)] text-left text-xs text-zinc-600 dark:text-zinc-400">
                <th className="py-2 font-medium">Strategy</th>
                <th className="py-2 text-right font-medium">vs maintenance</th>
                <th className="py-2 text-right font-medium">Muscle</th>
                <th className="py-2 text-right font-medium">Fat</th>
                <th className="py-2 text-right font-medium">Scale</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map(({ key, label, plan: p }) => (
                <tr
                  key={key}
                  className={
                    "border-b border-[var(--line)] " +
                    (key === currentKey ? "font-semibold text-accent-600 dark:text-accent-400" : "")
                  }
                >
                  <td className="py-2.5">{label}</td>
                  <td className="py-2.5 text-right tabular-nums">{signedKcal(p.deltaKcal)} kcal</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {signedW(p.totals.leanKg)} {wu}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {signedW(p.totals.fatKg)} {wu}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {signedW(p.totals.weightKg)} {wu}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Past the small muscle-only surplus, every extra calorie goes to fat. A classic +500 kcal bulk builds the
          same muscle as the muscle-only surplus, plus several {wu}{" "}of fat you&apos;ll later have to cut. This matches
          Helms et al. (2023), where a larger surplus mainly added fat rather than muscle.
        </p>

        <InfoNote>
          <p>
            <strong>Maintenance</strong> = BMR × activity level, where BMR averages Mifflin–St Jeor and Katch–McArdle (lean-mass based) when your body fat is known.
          </p>
          <p>
            <strong>Muscle rate</strong>{" "}comes from the Muscle-gain potential model (Aragon&apos;s rates by training
            age, adjusted for sex and age, capped at your natural ceiling).
          </p>
          <p>
            <strong>Energy costs</strong>{" "}(Hall&apos;s tissue energy densities): building 1 kg of lean tissue ≈{" "}
            {fmt(LEAN_GAIN_KCAL, 0)} kcal including synthesis costs; 1 kg of body fat ≈ {fmt(FAT_KCAL, 0)} kcal. So
            the build surplus = muscle rate × {fmt(LEAN_GAIN_KCAL, 0)} ÷ 7 per day, and anything extra is stored as
            fat at {fmt(FAT_KCAL, 0)} kcal/kg.
          </p>
          <p>
            <strong>Recomp</strong>: at maintenance, beginners can build ~60% of their normal rate,
            intermediates ~30%, advanced lifters ~12% (+15 points with higher body fat); the energy comes out of
            fat stores. <strong>Cut</strong>: with hard training and high protein, only a small share of weight lost
            is muscle; it rises if you&apos;re lean or losing faster than ~0.75%/week.
          </p>
          <p>
            Real-world maintenance varies ±10%, so treat the number as a starting point and adjust by 100 kcal
            based on your weekly average weight.
          </p>
        </InfoNote>
      </Card>
    </div>
  );
}
