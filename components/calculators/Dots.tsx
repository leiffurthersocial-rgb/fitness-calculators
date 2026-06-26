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
} from "../ui";
import { useProfile } from "@/lib/profile";
import { dotsScore } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

// DOTS interpretation bands (loose, for context only).
function dotsLevel(score: number): string {
  if (score >= 500) return "Elite";
  if (score >= 400) return "Advanced";
  if (score >= 300) return "Intermediate";
  if (score >= 200) return "Novice";
  return "Beginner";
}

export default function Dots() {
  const { profile } = useProfile();
  const unit = weightUnit(profile.units);

  // Bodyweight auto-fills from the profile; total is per-tool input.
  const [bwDisplay, setBwDisplay] = useState(
    Math.round(weightFromKg(profile.bodyweightKg, profile.units))
  );
  const [total, setTotal] = useState(profile.units === "metric" ? 400 : 880);
  const [sex, setSex] = useState<"male" | "female">(profile.sex);

  const bwKg = weightToKg(bwDisplay, profile.units);
  const totalKg = weightToKg(total, profile.units);
  const score = dotsScore(totalKg, bwKg, sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your lift</CardTitle>
        <div className="space-y-4">
          <Field label={`Bodyweight (${unit})`}>
            <NumberInput value={bwDisplay} onChange={setBwDisplay} suffix={unit} />
          </Field>
          <Field label={`Total lifted (${unit})`} hint="e.g. squat + bench + deadlift">
            <NumberInput value={total} onChange={setTotal} step={2.5} suffix={unit} />
          </Field>
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
        </div>
        <InfoNote>
          <p>
            DOTS multiplies your total by 500 / P(bodyweight), where P is a
            sex-specific 4th-order polynomial. It&apos;s the IPF&apos;s modern
            replacement for the Wilks coefficient.
          </p>
          <p>
            The score lets you compare strength fairly across bodyweights —
            higher is better, independent of how heavy you are.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Score</CardTitle>
        <div className="space-y-3">
          <Result label="DOTS score" value={fmt(score)} sub={dotsLevel(score)} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total" value={`${fmt(total)} ${unit}`} />
            <Stat
              label="Strength-to-weight"
              value={fmt(totalKg / bwKg, 2)}
              unit="×BW"
            />
          </div>
        </div>
      </Card>
    </CalcGrid>
  );
}
