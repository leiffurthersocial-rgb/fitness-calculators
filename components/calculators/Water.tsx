"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  InfoNote,
  CalcGrid,
  Stat,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useWeightField } from "@/lib/profile";
import { waterTargetMl } from "@/lib/formulas";
import { weightToKg, weightUnit, mlToOz, fmt } from "@/lib/units";

export default function Water() {
  const { units } = useUnits();
  const wu = weightUnit(units);

  const [bw, setBw] = useWeightField(units);
  const [exerciseHours, setExerciseHours] = useState(1);
  const [hot, setHot] = useState(false);

  const bwKg = weightToKg(bw, units);
  const ml = waterTargetMl({ bodyweightKg: bwKg, exerciseHours, hotClimate: hot });
  const liters = ml / 1000;
  const oz = mlToOz(ml);
  const cups = oz / 8;

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <Field label={`Bodyweight (${wu})`}>
            <NumberInput value={bw} onChange={setBw} suffix={wu} />
          </Field>
          <Field label="Exercise today (hours)">
            <NumberInput value={exerciseHours} onChange={setExerciseHours} step={0.25} suffix="h" />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={hot}
              onChange={(e) => setHot(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent-500)]"
            />
            <span className="text-sm font-medium">Hot / humid climate</span>
          </label>
        </div>
        <InfoNote>
          <p>Baseline ≈ 33 ml × bodyweight (kg).</p>
          <p>+500 ml per hour of exercise; +10% in a hot climate.</p>
          <p>
            This is total fluid — food contributes ~20%, so your drinking target
            is a little lower. Adjust to thirst and urine colour.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Daily target</CardTitle>
        <div className="space-y-3">
          <Result label="Water target" value={fmt(liters, 2)} unit="L" />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="In ounces" value={fmt(oz, 0)} unit="oz" />
            <Stat label="In cups (8 oz)" value={fmt(cups, 1)} />
          </div>
          {/* Glasses visual */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Array.from({ length: Math.min(Math.round(cups), 16) }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-4 rounded-b-md rounded-t-sm bg-accent-400/70 dark:bg-accent-500/60"
                title="≈ 1 cup"
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            ≈ {Math.round(cups)} cups spread across the day.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
