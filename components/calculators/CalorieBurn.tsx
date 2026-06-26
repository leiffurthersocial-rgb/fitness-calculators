"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  Result,
  InfoNote,
  CalcGrid,
  Stat,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { caloriesFromMet, MET_ACTIVITIES } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

export default function CalorieBurn() {
  const { profile } = useProfile();
  const wu = weightUnit(profile.units);

  const [activity, setActivity] = useState<string>("run_easy");
  const [minutes, setMinutes] = useState(45);
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(profile.bodyweightKg, profile.units))
  );

  const met = MET_ACTIVITIES.find((a) => a.key === activity)?.met ?? 5;
  const kg = weightToKg(weight, profile.units);
  const kcal = caloriesFromMet(met, kg, minutes);
  const perHour = caloriesFromMet(met, kg, 60);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Session</CardTitle>
        <div className="space-y-4">
          <Field label="Activity">
            <Select
              value={activity}
              onChange={setActivity}
              options={MET_ACTIVITIES.map((a) => ({
                value: a.key,
                label: `${a.label} · ${a.met} MET`,
              }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (min)">
              <NumberInput value={minutes} onChange={setMinutes} step={5} suffix="min" />
            </Field>
            <Field label={`Bodyweight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
          </div>
          <Result label="Calories burned" value={fmt(kcal, 0)} unit="kcal" />
        </div>
        <InfoNote>
          <p>kcal = MET × 3.5 × kg ÷ 200 × minutes.</p>
          <p>
            A MET is a multiple of resting metabolism (1 MET ≈ sitting quietly).
            Values are population averages — actual burn varies with intensity,
            fitness and efficiency.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Breakdown</CardTitle>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Per hour" value={fmt(perHour, 0)} unit="kcal" />
            <Stat label="Per minute" value={fmt(kcal / Math.max(1, minutes), 1)} unit="kcal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Intensity" value={`${met} MET`} />
            <Stat
              label="≈ food equivalent"
              value={fmt(kcal / 250, 1)}
              unit="snacks"
            />
          </div>
          <p className="text-xs text-zinc-500">
            “Snacks” ≈ 250 kcal each (a banana + a handful of nuts). Pair this
            with the TDEE and Macro tools to plan your day.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
