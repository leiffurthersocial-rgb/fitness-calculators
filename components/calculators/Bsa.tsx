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
import { useProfile } from "@/lib/profile";
import { bsaMosteller, bsaDuBois } from "@/lib/formulas";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  lengthUnit,
  fmt,
} from "@/lib/units";

export default function Bsa() {
  const { profile } = useProfile();
  const wu = weightUnit(profile.units);
  const lu = lengthUnit(profile.units);

  const [weight, setWeight] = useState(
    Math.round(weightFromKg(profile.bodyweightKg, profile.units))
  );
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(profile.heightCm, profile.units))
  );

  const kg = weightToKg(weight, profile.units);
  const cm = lengthToCm(height, profile.units);
  const mosteller = bsaMosteller(kg, cm);
  const dubois = bsaDuBois(kg, cm);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
          </div>
          <Result label="Body surface area (Mosteller)" value={fmt(mosteller, 2)} unit="m²" />
        </div>
        <InfoNote>
          <p>Mosteller: BSA = √(height_cm × weight_kg ÷ 3600).</p>
          <p>Du Bois: 0.007184 × weight^0.425 × height^0.725.</p>
          <p>
            BSA is used clinically for drug dosing, cardiac index and burn
            assessment. The average adult is roughly 1.7 m².
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Methods compared</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Mosteller" value={fmt(mosteller, 2)} unit="m²" />
          <Stat label="Du Bois" value={fmt(dubois, 2)} unit="m²" />
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          Mosteller is simplest and the common clinical default; Du Bois is the
          older standard. They usually agree within a couple of percent.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Average adult ≈ 1.7 m² · larger BSA generally means higher absolute
          metabolic needs.
        </p>
      </Card>
    </CalcGrid>
  );
}
