"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  Select,
  InfoNote,
  CalcGrid,
  SegmentedControl,
  Stat,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField, useHeightField } from "@/lib/profile";
import { bmrMifflin, tdee, ACTIVITY_LEVELS } from "@/lib/formulas";
import {
  weightToKg,
  lengthToCm,
  weightUnit,
  lengthUnit,
  fmt,
} from "@/lib/units";

export default function Tdee() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);

  // Auto-filled from the shared profile; edits here update it everywhere.
  const { profile, patch } = useProfile();
  const { age, sex } = profile;
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);
  const [activity, setActivity] = useState<string>("moderate");

  const kg = weightToKg(weight, units);
  const cm = lengthToCm(height, units);
  const bmr = bmrMifflin(kg, cm, age, sex);
  const mult =
    ACTIVITY_LEVELS.find((a) => a.key === activity)?.multiplier ?? 1.55;
  const maintenance = tdee(bmr, mult);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <NumberInput value={age} onChange={(v) => patch({ age: v })} />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
          </div>
          <Field label="Activity level">
            <Select
              value={activity}
              onChange={setActivity}
              options={ACTIVITY_LEVELS.map((a) => ({
                value: a.key,
                label: a.label,
              }))}
            />
          </Field>
        </div>
        <InfoNote>
          <p>BMR (Mifflin–St Jeor):</p>
          <p>Men: 10·kg + 6.25·cm − 5·age + 5</p>
          <p>Women: 10·kg + 6.25·cm − 5·age − 161</p>
          <p>TDEE = BMR × activity multiplier ({mult}).</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Energy needs</CardTitle>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="BMR" value={fmt(bmr, 0)} unit="kcal" />
            <Result label="Maintenance (TDEE)" value={fmt(maintenance, 0)} unit="kcal" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Cut (−500)" value={fmt(maintenance - 500, 0)} unit="kcal" />
            <Stat label="Lean bulk (+300)" value={fmt(maintenance + 300, 0)} unit="kcal" />
            <Stat label="Bulk (+500)" value={fmt(maintenance + 500, 0)} unit="kcal" />
          </div>
          <p className="text-xs text-zinc-500">
            A 500 kcal/day deficit ≈ ~0.45 kg (1 lb) of fat loss per week. Feed
            your maintenance number into the Macro calculator next.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
