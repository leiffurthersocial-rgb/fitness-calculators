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
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import {
  muscleGainPotential,
  TRAINING_LEVELS,
  type TrainingLevel,
} from "@/lib/formulas";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  lengthUnit,
  fmt,
} from "@/lib/units";

export default function MuscleGain() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);

  const [sex, setSex] = useState<"male" | "female">(DEFAULTS.sex);
  const [age, setAge] = useState(DEFAULTS.age);
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(DEFAULTS.heightCm, units))
  );
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(DEFAULTS.bodyweightKg, units))
  );
  const [bodyFat, setBodyFat] = useState(15);
  const [level, setLevel] = useState<TrainingLevel>("intermediate");

  const r = muscleGainPotential({
    sex,
    age,
    heightCm: lengthToCm(height, units),
    weightKg: weightToKg(weight, units),
    bodyFatPct: bodyFat,
    level,
  });

  // Display helpers: gains stored in kg, shown in the active unit.
  const disp = (kg: number) => fmt(weightFromKg(kg, units), 1);
  const range = (lo: number, hi: number) =>
    Math.round(weightFromKg(lo, units) * 10) === Math.round(weightFromKg(hi, units) * 10)
      ? `${disp(hi)}`
      : `${disp(lo)}–${disp(hi)}`;

  const year = r.timeframes.find((t) => t.months === 12)!;
  const atCeiling = r.remainingKg < 0.1;
  const pctFill = Math.min(100, r.pctOfPotential);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>You</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex">
              <SegmentedControl
                value={sex}
                onChange={setSex}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
            <Field label="Age">
              <NumberInput value={age} onChange={setAge} />
            </Field>
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
          </div>
          <Field label="Body fat %" hint="from Body composition tool">
            <NumberInput value={bodyFat} onChange={setBodyFat} step={0.5} suffix="%" />
          </Field>
          <Field label="Training experience">
            <Select
              value={level}
              onChange={setLevel}
              options={TRAINING_LEVELS.map((t) => ({
                value: t.key,
                label: `${t.label} (${t.years})`,
              }))}
            />
          </Field>
          <Tip>
            Be honest about experience — it&apos;s the biggest lever. Your first
            year of proper training is when muscle comes fastest; it slows every
            year after, no matter how well you train.
          </Tip>
        </div>
        <InfoNote>
          <p>
            Rate of gain uses Alan Aragon&apos;s model — realistic monthly muscle
            gain as a % of bodyweight by experience: beginner 1–1.5%, intermediate
            0.5–1%, advanced 0.25–0.5%. Women are scaled to ~half the absolute
            rate; gains taper gently past age 30.
          </p>
          <p>
            The ceiling is the drug-free FFMI limit (~25 normalised for men, ~21.5
            for women; Kouri et al.). Your remaining lean mass to that ceiling caps
            every projection, so the closer you are, the slower it goes.
          </p>
          <p>
            Figures are lean tissue under good training, diet and sleep — an
            upper-bound guide, not a promise. Real scale weight will rise a bit
            faster as some fat comes along for the ride.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your muscle-gain outlook</CardTitle>

        <Result
          label={atCeiling ? "Next 12 months" : "Muscle you can gain in 12 months"}
          value={atCeiling ? "≈ 0" : `+${range(year.loKg, year.highKg)}`}
          unit={atCeiling ? undefined : wu}
          sub={
            atCeiling
              ? "You're already at your estimated natural ceiling — focus on strength & maintenance"
              : year.capped
              ? "Limited by your remaining natural potential"
              : `${TRAINING_LEVELS.find((t) => t.key === level)!.label} rate, age-adjusted`
          }
        />

        {/* Timeframe breakdown */}
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Timeframe</th>
                <th className="px-4 py-2 font-medium">Muscle gain</th>
                <th className="px-4 py-2 font-medium">Per month</th>
              </tr>
            </thead>
            <tbody>
              {r.timeframes.map((t) => (
                <tr key={t.months} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium">{t.months} months</td>
                  <td className="px-4 py-2">
                    +{range(t.loKg, t.highKg)} {wu}
                    {t.capped && !atCeiling && (
                      <span className="ml-1 text-xs text-amber-500">capped</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">
                    {atCeiling
                      ? "—"
                      : `${range(r.ratePerMonthLoKg, r.ratePerMonthHiKg)} ${wu}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Position vs natural ceiling */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">Toward your natural ceiling</span>
            <span className="tabular-nums text-zinc-500">
              {fmt(r.pctOfPotential, 0)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-accent-500"
              style={{ width: `${pctFill}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Stat label="Lean mass now" value={disp(r.leanMassKg)} unit={wu} />
            <Stat label="At ceiling" value={disp(r.ceilingLeanKg)} unit={wu} />
            <Stat
              label="Lifetime left"
              value={atCeiling ? "0" : disp(r.remainingKg)}
              unit={wu}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Badge tone={atCeiling ? "warn" : "accent"}>
            Normalised FFMI {fmt(r.normalizedFfmi, 1)}
          </Badge>
          <span className="text-xs text-zinc-500">
            ceiling ≈ {fmt(r.ceilingNffmi, 1)} ({sex === "male" ? "men" : "women"})
          </span>
        </div>
      </Card>
    </CalcGrid>
  );
}
