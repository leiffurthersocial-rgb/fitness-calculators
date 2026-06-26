"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  SegmentedControl,
  InfoNote,
  CalcGrid,
  Stat,
  Badge,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import {
  idealWeightFormulas,
  healthyWeightRange,
  leanBodyMassBoer,
  bmi,
  bmiCategory,
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

export default function IdealWeight() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);

  const [sex, setSex] = useState<"male" | "female">(DEFAULTS.sex);
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(DEFAULTS.heightCm, units))
  );
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(DEFAULTS.bodyweightKg, units))
  );

  const heightCm = lengthToCm(height, units);
  const kg = weightToKg(weight, units);

  const formulas = idealWeightFormulas(heightCm, sex);
  const avgKg = formulas.reduce((s, f) => s + f.kg, 0) / formulas.length;
  const range = healthyWeightRange(heightCm);
  const lbm = leanBodyMassBoer(kg, heightCm, sex);
  const bmiVal = bmi(kg, heightCm);

  // Where the current weight sits relative to the healthy range.
  const status =
    kg < range.minKg ? "below" : kg > range.maxKg ? "above" : "within";

  const disp = (k: number) => fmt(weightFromKg(k, units));

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <Field label="Sex">
            <SegmentedControl
              value={sex}
              onChange={setSex}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <Field label={`Height (${lu})`}>
            <NumberInput value={height} onChange={setHeight} suffix={lu} />
          </Field>
          <Field label={`Current weight (${wu})`} hint="for context">
            <NumberInput value={weight} onChange={setWeight} suffix={wu} />
          </Field>

          <Result
            label="Healthy weight range"
            value={`${disp(range.minKg)}–${disp(range.maxKg)}`}
            unit={wu}
            sub="BMI 18.5–24.9 for your height"
          />
          <Tip>
            The classic formulas below were built for medication dosing and run
            a little lean. Use the <strong>healthy BMI range</strong> as your
            practical target, and remember it ignores muscle — lean, muscular
            people often sit above it and are perfectly healthy.
          </Tip>
        </div>
        <InfoNote>
          <p>Healthy range = BMI 18.5 and 24.9 × height².</p>
          <p>
            Formula weights add a per-inch increment above 5 ft (e.g. Devine:
            men 50 kg + 2.3 kg/in, women 45.5 kg + 2.3 kg/in).
          </p>
          <p>Lean mass uses the Boer formula from your current weight & height.</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Estimates</CardTitle>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Formula</th>
                  <th className="px-4 py-2 font-medium">Ideal weight ({wu})</th>
                </tr>
              </thead>
              <tbody>
                {formulas.map((f) => (
                  <tr key={f.name} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 font-medium">{f.name}</td>
                    <td className="px-4 py-2">{disp(f.kg)}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-100 bg-accent-50 dark:border-zinc-800 dark:bg-accent-900/20">
                  <td className="px-4 py-2 font-semibold">Average</td>
                  <td className="px-4 py-2 font-semibold">{disp(avgKg)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Lean body mass" value={disp(lbm)} unit={wu} />
            <div>
              <Stat label="Current BMI" value={fmt(bmiVal)} />
              <div className="mt-1">
                <Badge tone={bmiCategory(bmiVal) === "Normal" ? "accent" : "warn"}>
                  {bmiCategory(bmiVal)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
            {status === "within" ? (
              <span className="text-accent-700 dark:text-accent-400">
                ✓ Your current weight is within the healthy range.
              </span>
            ) : status === "below" ? (
              <span>
                You&apos;re about{" "}
                <strong>{disp(range.minKg - kg)} {wu}</strong> below the healthy
                range.
              </span>
            ) : (
              <span>
                You&apos;re about{" "}
                <strong>{disp(kg - range.maxKg)} {wu}</strong> above the healthy
                range — though if you carry a lot of muscle this may not apply.
              </span>
            )}
          </div>
        </div>
      </Card>
    </CalcGrid>
  );
}
