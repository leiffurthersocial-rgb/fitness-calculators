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
  SegmentedControl,
  Stat,
  Badge,
} from "../ui";
import { useProfile } from "@/lib/profile";
import {
  navyBodyFat,
  bmi,
  bmiCategory,
  waistToHeight,
  whtrCategory,
} from "@/lib/formulas";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  smallLengthUnit,
  fmt,
} from "@/lib/units";

export default function BodyComp() {
  const { profile } = useProfile();
  const wu = weightUnit(profile.units);
  const su = smallLengthUnit(profile.units);

  const [sex, setSex] = useState<"male" | "female">(profile.sex);
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(profile.bodyweightKg, profile.units))
  );
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(profile.heightCm, profile.units))
  );
  // Tape measurements, stored in display unit.
  const [neck, setNeck] = useState(profile.units === "metric" ? 38 : 15);
  const [waist, setWaist] = useState(profile.units === "metric" ? 85 : 33);
  const [hip, setHip] = useState(profile.units === "metric" ? 95 : 37);

  const kg = weightToKg(weight, profile.units);
  const heightCm = lengthToCm(height, profile.units);
  const neckCm = lengthToCm(neck, profile.units);
  const waistCm = lengthToCm(waist, profile.units);
  const hipCm = lengthToCm(hip, profile.units);

  const bf = navyBodyFat({ sex, heightCm, neckCm, waistCm, hipCm });
  const bmiVal = bmi(kg, heightCm);
  const whtr = waistToHeight(waistCm, heightCm);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Measurements</CardTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label={`Height (${su})`}>
              <NumberInput value={height} onChange={setHeight} suffix={su} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Neck (${su})`}>
              <NumberInput value={neck} onChange={setNeck} suffix={su} />
            </Field>
            <Field label={`Waist (${su})`}>
              <NumberInput value={waist} onChange={setWaist} suffix={su} />
            </Field>
          </div>
          {sex === "female" && (
            <Field label={`Hip (${su})`}>
              <NumberInput value={hip} onChange={setHip} suffix={su} />
            </Field>
          )}
        </div>
        <InfoNote>
          <p>
            US Navy body fat (tape method) uses log-transformed waist, neck (and
            hip for women) plus height. Measure relaxed, at the navel.
          </p>
          <p>BMI = kg / m². Waist-to-height = waist ÷ height (same unit).</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Results</CardTitle>
        <div className="space-y-3">
          <Result label="Body fat (US Navy)" value={fmt(bf)} unit="%" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Stat label="BMI" value={fmt(bmiVal)} />
              <div className="mt-1">
                <Badge tone={bmiCategory(bmiVal) === "Normal" ? "accent" : "warn"}>
                  {bmiCategory(bmiVal)}
                </Badge>
              </div>
            </div>
            <div>
              <Stat label="Waist-to-height" value={fmt(whtr, 2)} />
              <div className="mt-1">
                <Badge tone={whtrCategory(whtr) === "Healthy" ? "accent" : "warn"}>
                  {whtrCategory(whtr)}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            BMI ignores muscle mass, so athletes often read “overweight”. Body
            fat % and waist-to-height ratio are usually more informative.
          </p>
        </div>
      </Card>
    </CalcGrid>
  );
}
