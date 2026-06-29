"use client";

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
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField, useHeightField } from "@/lib/profile";
import { ffmi, ffmiCategory } from "@/lib/formulas";
import {
  weightFromKg,
  weightToKg,
  lengthToCm,
  weightUnit,
  lengthUnit,
  fmt,
} from "@/lib/units";

export default function Ffmi() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);

  const { profile, patch } = useProfile();
  const { sex } = profile;
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);
  const bodyFat = profile.bodyFatPct;
  const setBodyFat = (v: number) => patch({ bodyFatPct: v });

  const kg = weightToKg(weight, units);
  const cm = lengthToCm(height, units);
  const r = ffmi(kg, cm, bodyFat);
  const category = ffmiCategory(r.normalizedFfmi, sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <Field label="Sex">
            <SegmentedControl
              value={sex}
              onChange={(v) => patch({ sex: v })}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
          </div>
          <Field label="Body fat %" hint="from Body composition tool">
            <NumberInput value={bodyFat} onChange={setBodyFat} step={0.5} suffix="%" />
          </Field>
        </div>
        <InfoNote>
          <p>Lean mass = weight × (1 − body fat%).</p>
          <p>FFMI = lean mass ÷ height². Normalised adds 6.1 × (1.8 − height m) so heights compare fairly.</p>
          <p>
            ~25 (normalised) is around the natural ceiling for most men, ~21 for
            women. It&apos;s the muscularity counterpart to BMI.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Results</CardTitle>
        <div className="space-y-3">
          <Result label="Normalised FFMI" value={fmt(r.normalizedFfmi)} sub={category} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Raw FFMI" value={fmt(r.ffmi)} />
            <Stat label="Lean mass" value={fmt(weightFromKg(r.leanMassKg, units))} unit={wu} />
          </div>
          <div>
            <Badge tone={category === "Beyond natural limits" ? "warn" : "accent"}>
              {category}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">
            Unlike BMI, FFMI rewards muscle rather than penalising it — handy for
            tracking lean gains across a bulk or cut.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
