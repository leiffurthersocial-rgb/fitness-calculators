"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  Result,
  Stat,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import { dietPlan, ACTIVITY_LEVELS, type DietGoal } from "@/lib/formulas";
import { weightFromKg, weightUnit, fmt } from "@/lib/units";

const PACES: Record<"lose" | "gain", { key: string; label: string; pct: number }[]> = {
  lose: [
    { key: "easy", label: "Conservative · 0.5%/wk", pct: 0.5 },
    { key: "mod", label: "Moderate · 0.75%/wk", pct: 0.75 },
    { key: "fast", label: "Aggressive · 1%/wk", pct: 1.0 },
  ],
  gain: [
    { key: "easy", label: "Lean · 0.125%/wk", pct: 0.125 },
    { key: "mod", label: "Moderate · 0.25%/wk", pct: 0.25 },
    { key: "fast", label: "Fast · 0.4%/wk", pct: 0.4 },
  ],
};

export default function DietPlanner() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile } = useProfile();

  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal] = useState<DietGoal>("lose");
  const [paceKey, setPaceKey] = useState("mod");
  const [targetBf, setTargetBf] = useState(12);

  const activityMultiplier =
    ACTIVITY_LEVELS.find((a) => a.key === activity)?.multiplier ?? 1.55;
  const paceList = goal === "maintain" ? PACES.lose : PACES[goal];
  const ratePct = paceList.find((p) => p.key === paceKey)?.pct ?? 0.75;

  const plan = dietPlan({
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct,
    activityMultiplier,
    goal,
    ratePctPerWeek: ratePct,
    experience: profile.experience,
    targetBodyFatPct: goal === "maintain" ? undefined : targetBf,
  });

  const disp = (kg: number) => fmt(weightFromKg(kg, units), 1);
  const isDeficit = plan.dailyDeltaKcal < 0;
  const shownWeeks = plan.trajectory.filter((t) => t.week % 4 === 0);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your plan</CardTitle>
        <div className="space-y-4">
          <Field label="Goal">
            <SegmentedControl
              value={goal}
              onChange={(v) => setGoal(v)}
              options={[
                { value: "lose", label: "Lose fat" },
                { value: "maintain", label: "Maintain" },
                { value: "gain", label: "Gain muscle" },
              ]}
            />
          </Field>
          <Field label="Activity level">
            <Select
              value={activity}
              onChange={setActivity}
              options={ACTIVITY_LEVELS.map((a) => ({ value: a.key, label: a.label }))}
            />
          </Field>
          {goal !== "maintain" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pace">
                <Select
                  value={paceKey}
                  onChange={setPaceKey}
                  options={paceList.map((p) => ({ value: p.key, label: p.label }))}
                />
              </Field>
              <Field label="Target body fat %">
                <NumberInput value={targetBf} onChange={setTargetBf} suffix="%" />
              </Field>
            </div>
          )}
          <Tip>
            Stats come from <strong>Your stats</strong> in the sidebar
            ({profile.sex === "male" ? "M" : "F"}, {profile.age}y,{" "}
            {disp(profile.weightKg)}&nbsp;{wu}, {fmt(profile.bodyFatPct)}% bf). A
            cut keeps protein high to hold onto muscle; a bulk caps how fast
            muscle can come, so going faster just adds fat.
          </Tip>
        </div>
        <InfoNote>
          <p>TDEE = Mifflin–St Jeor BMR × activity. 1 kg of body mass ≈ 7700 kcal.</p>
          <p>
            Daily calories = TDEE ± (weekly rate × 7700 ÷ 7). The timeline splits
            each week&apos;s change into fat and lean: on a cut, leaner means more
            lean is at risk; on a bulk, lean gain is capped by your natural rate
            and the rest is fat.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Targets</CardTitle>
        <Result
          label="Daily calories"
          value={fmt(plan.calorieTarget, 0)}
          unit="kcal"
          sub={
            goal === "maintain"
              ? "Maintenance"
              : `${isDeficit ? "Deficit" : "Surplus"} ${fmt(Math.abs(plan.dailyDeltaKcal), 0)} kcal/day · ${disp(Math.abs(plan.rateKgPerWeek))} ${wu}/wk`
          }
        />

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Protein" value={fmt(plan.proteinG, 0)} unit="g" />
          <Stat label="Carbs" value={fmt(plan.carbsG, 0)} unit="g" />
          <Stat label="Fat" value={fmt(plan.fatG, 0)} unit="g" />
        </div>

        {goal !== "maintain" && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 ${
              plan.weeksToTarget != null
                ? "border-accent-200 bg-accent-50 dark:border-accent-800 dark:bg-accent-900/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {plan.weeksToTarget != null ? (
              <div className="text-sm">
                Reach <strong>{fmt(targetBf)}%</strong> body fat in{" "}
                <span className="font-semibold text-accent-700 dark:text-accent-300">
                  ~{plan.weeksToTarget} weeks
                </span>{" "}
                (≈ {Math.round(plan.weeksToTarget / 4.345)} months), landing near{" "}
                <strong>{disp(plan.targetWeightKg ?? 0)} {wu}</strong>.
              </div>
            ) : (
              <div className="text-sm text-zinc-500">
                {goal === "lose"
                  ? "You're already at or below that body-fat target."
                  : "Target not reached within 2 years at this pace — pick a higher target or faster pace."}
              </div>
            )}
          </div>
        )}

        {goal !== "maintain" && shownWeeks.length > 1 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Week</th>
                  <th className="px-4 py-2 font-medium">Weight ({wu})</th>
                  <th className="px-4 py-2 font-medium">Body fat</th>
                </tr>
              </thead>
              <tbody>
                {shownWeeks.map((t) => (
                  <tr key={t.week} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 font-medium">{t.week === 0 ? "Now" : t.week}</td>
                    <td className="px-4 py-2">{disp(t.weightKg)}</td>
                    <td className="px-4 py-2 text-zinc-500">{fmt(t.bodyFatPct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-400">
          Recalculate every few weeks — as your weight drops, so does your TDEE.
        </p>
      </Card>
    </CalcGrid>
  );
}
