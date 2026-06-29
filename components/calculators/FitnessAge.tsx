"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  Result,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { fitnessAge, vo2maxRestingHR, maxHRTanaka } from "@/lib/formulas";
import { fmt } from "@/lib/units";

type Method = "vo2max" | "restingHR";

export default function FitnessAge() {
  const { profile, patch } = useProfile();
  const [method, setMethod] = useState<Method>("vo2max");
  const [vo2, setVo2] = useState(42);

  // Estimate VO₂max from resting HR (Uth–Sørensen) when that method is chosen.
  const estimatedVo2 = vo2maxRestingHR(maxHRTanaka(profile.age), profile.restingHR);
  const vo2max = method === "vo2max" ? vo2 : estimatedVo2;

  const r = fitnessAge(vo2max, profile.age, profile.sex);
  const younger = r.deltaYears > 0;
  const tone = r.deltaYears >= 5 ? "accent" : r.deltaYears <= -5 ? "warn" : "neutral";

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your fitness</CardTitle>
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
          </div>
          <Field label="Method">
            <SegmentedControl
              value={method}
              onChange={setMethod}
              options={[
                { value: "vo2max", label: "VO₂max" },
                { value: "restingHR", label: "Resting HR" },
              ]}
            />
          </Field>
          {method === "vo2max" ? (
            <Field label="VO₂max" hint="from the VO₂ max tool">
              <NumberInput value={vo2} onChange={setVo2} suffix="ml/kg/min" />
            </Field>
          ) : (
            <Field label="Resting heart rate">
              <NumberInput
                value={profile.restingHR}
                onChange={(v) => patch({ restingHR: v })}
                suffix="bpm"
              />
            </Field>
          )}
        </div>
        <InfoNote>
          <p>
            Your fitness age is the age at which your VO₂max would be merely{" "}
            <em>average</em> for your sex. A higher VO₂max → a younger fitness
            age — one of the strongest single predictors of longevity.
          </p>
          <p>
            The resting-HR method estimates VO₂max via the Uth–Sørensen formula
            (max HR ÷ resting HR × 15). Reference values are population averages,
            so treat the result as a motivational estimate.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your fitness age</CardTitle>
        <Result
          label="Fitness age"
          value={r.fitnessAge}
          unit="years"
          sub={
            r.deltaYears === 0
              ? "right on your calendar age"
              : `${Math.abs(r.deltaYears)} years ${younger ? "younger" : "older"} than your calendar age`
          }
        />
        <div className="mt-3">
          <Badge tone={tone}>
            {younger ? "Fitter than average" : r.deltaYears === 0 ? "Average for your age" : "Room to improve"}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Your VO₂max" value={fmt(vo2max, 1)} unit="ml/kg/min" />
          <Stat label={`Average at ${profile.age}`} value={fmt(r.averageForAge, 1)} unit="ml/kg/min" />
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Raising VO₂max by ~3.5 ml/kg/min (one MET) is a meaningful drop in
          fitness age and is linked to lower all-cause mortality.
        </p>
      </Card>
    </CalcGrid>
  );
}
