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
  Badge,
} from "../ui";
import { useProfile } from "@/lib/profile";
import {
  vo2maxCooper,
  vo2maxRestingHR,
  vo2maxMileAndHalf,
  vo2maxCategory,
  maxHRTanaka,
} from "@/lib/formulas";
import { milesToM, fmt, distanceUnit, lengthFromCm } from "@/lib/units";

type Method = "cooper" | "resting" | "mile15";

export default function Vo2Max() {
  const { profile } = useProfile();
  const [method, setMethod] = useState<Method>("cooper");

  // Cooper: distance covered in 12 min. Stored in display distance unit.
  const [coopDist, setCoopDist] = useState(profile.units === "metric" ? 2400 : 1.5);
  // 1.5-mile run time in minutes.
  const [mileTime, setMileTime] = useState(11);
  // Resting method uses profile resting HR + estimated max HR.
  const [restingHR, setRestingHR] = useState(profile.restingHR);

  let vo2 = 0;
  if (method === "cooper") {
    // Cooper formula needs meters; convert if imperial (entered as miles).
    const meters = profile.units === "metric" ? coopDist : milesToM(coopDist);
    vo2 = vo2maxCooper(meters);
  } else if (method === "mile15") {
    vo2 = vo2maxMileAndHalf(mileTime);
  } else {
    vo2 = vo2maxRestingHR(maxHRTanaka(profile.age), restingHR);
  }

  const category = vo2maxCategory(vo2, profile.age, profile.sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Test</CardTitle>
        <div className="space-y-4">
          <Field label="Method">
            <Select
              value={method}
              onChange={setMethod}
              options={[
                { value: "cooper", label: "Cooper 12-minute test" },
                { value: "mile15", label: "1.5-mile run" },
                { value: "resting", label: "Resting HR method" },
              ]}
            />
          </Field>

          {method === "cooper" && (
            <Field
              label={`Distance in 12 min (${
                profile.units === "metric" ? "m" : "mi"
              })`}
            >
              <NumberInput
                value={coopDist}
                onChange={setCoopDist}
                step={profile.units === "metric" ? 50 : 0.1}
              />
            </Field>
          )}

          {method === "mile15" && (
            <Field label="1.5-mile time (minutes)">
              <NumberInput value={mileTime} onChange={setMileTime} step={0.1} suffix="min" />
            </Field>
          )}

          {method === "resting" && (
            <>
              <Field label="Resting HR (bpm)" hint="from profile">
                <NumberInput value={restingHR} onChange={setRestingHR} suffix="bpm" />
              </Field>
              <p className="text-xs text-zinc-500">
                Uses estimated max HR of {fmt(maxHRTanaka(profile.age), 0)} bpm
                (Tanaka, from your age {profile.age}).
              </p>
            </>
          )}

          <Result
            label="Estimated VO₂max"
            value={fmt(vo2)}
            unit="ml/kg/min"
            sub={`Category for ${profile.sex}, age ${profile.age}`}
          />
          <div>
            <Badge tone={category === "Poor" || category === "Very poor" ? "warn" : "accent"}>
              {category}
            </Badge>
          </div>
        </div>
        <InfoNote>
          <p>Cooper: VO₂max = (distance_m − 504.9) / 44.73.</p>
          <p>1.5-mile: VO₂max = 3.5 + 483 / time_min.</p>
          <p>Resting HR: VO₂max = 15.3 × (maxHR / restingHR).</p>
          <p>
            Category bands are age- and sex-adjusted (Cooper Institute norms).
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>What VO₂max means</CardTitle>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          VO₂max is the maximum volume of oxygen your body can use per minute,
          per kg of bodyweight. It&apos;s the single best lab measure of aerobic
          fitness. Field tests like these estimate it within a few points.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          {[
            ["Recreational", "30–40"],
            ["Trained", "40–50"],
            ["Competitive", "50–60"],
            ["Elite endurance", "60+"],
          ].map(([label, range]) => (
            <div
              key={label}
              className="flex justify-between border-b border-zinc-100 pb-1 dark:border-zinc-800"
            >
              <span className="text-zinc-500">{label}</span>
              <span className="font-medium">{range} ml/kg/min</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Current display units: {distanceUnit(profile.units)}. Height on file:{" "}
          {fmt(lengthFromCm(profile.heightCm, profile.units), 0)}{" "}
          {profile.units === "metric" ? "cm" : "in"}.
        </p>
      </Card>
    </CalcGrid>
  );
}
