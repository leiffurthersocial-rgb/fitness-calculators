"use client";

import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  Result,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField } from "@/lib/profile";
import { strengthScore, type Lift } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

const WEIGHT_LIFTS: { key: Lift; label: string }[] = [
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench" },
  { key: "deadlift", label: "Deadlift" },
  { key: "ohp", label: "Overhead" },
];

function scoreColor(s: number): string {
  if (s >= 85) return "#a855f7";
  if (s >= 65) return "#10b981";
  if (s >= 45) return "#34d399";
  if (s >= 25) return "#f59e0b";
  return "#ef4444";
}

export default function StrengthScore() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile, patch, patchLifts } = useProfile();
  const [bw, setBw] = useWeightField(units);

  const liftDisp = (kg: number) => (kg > 0 ? Number(weightFromKg(kg, units).toFixed(1)) : 0);
  const weights: Record<Lift, number> = {
    squat: liftDisp(profile.lifts.squat),
    bench: liftDisp(profile.lifts.bench),
    deadlift: liftDisp(profile.lifts.deadlift),
    ohp: liftDisp(profile.lifts.ohp),
    pullup: 0,
  };
  const pullups = profile.lifts.pullups;
  const setPullups = (v: number) => patchLifts({ pullups: v });

  const values: Partial<Record<Lift, number>> = {
    squat: profile.lifts.squat,
    bench: profile.lifts.bench,
    deadlift: profile.lifts.deadlift,
    ohp: profile.lifts.ohp,
    pullup: pullups,
  };
  const r = strengthScore(values, profile.sex, weightToKg(bw, units), profile.age);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your lifts</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex">
              <SegmentedControl
                value={profile.sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
            <Field label="Age">
              <NumberInput value={profile.age} onChange={(v) => patch({ age: v })} />
            </Field>
            <Field label={`Bodyweight (${wu})`}>
              <NumberInput value={bw} onChange={setBw} suffix={wu} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {WEIGHT_LIFTS.map((l) => (
              <Field key={l.key} label={`${l.label} 1RM (${wu})`}>
                <NumberInput
                  value={weights[l.key]}
                  onChange={(v) => patchLifts({ [l.key]: v ? weightToKg(v, units) : 0 })}
                  suffix={wu}
                />
              </Field>
            ))}
            <Field label="Max pull-ups">
              <NumberInput value={pullups} onChange={setPullups} suffix="reps" />
            </Field>
          </div>
        </div>
        <InfoNote>
          <p>
            Each lift is scored against age-, bodyweight- and sex-adjusted
            standards (the same engine as Strength standards), then averaged into
            one percentile. 50 ≈ a typical trainee; 85+ is advanced/elite.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your score</CardTitle>
        <Result
          label="Overall strength score"
          value={fmt(r.score, 0)}
          unit="/ 100"
          sub={`${r.level} · top ${fmt(100 - r.score, 0)}% of trainees`}
        />
        <div className="mt-4 space-y-2.5">
          {r.lifts.map((l) => (
            <div key={l.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span className="font-medium">{l.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-zinc-400">{l.level}</span>
                  <span
                    className="w-8 text-right font-semibold tabular-nums"
                    style={{ color: scoreColor(l.percentile) }}
                  >
                    {fmt(l.percentile, 0)}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, l.percentile)}%`, backgroundColor: scoreColor(l.percentile) }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Enter only the lifts you train — the score averages whatever you fill in.
        </p>
      </Card>
    </CalcGrid>
  );
}
