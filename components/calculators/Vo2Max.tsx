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
  Tip,
  SegmentedControl,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import {
  vo2maxCooper,
  vo2maxRestingHR,
  vo2maxMileAndHalf,
  vo2maxCategory,
  maxHRTanaka,
} from "@/lib/formulas";
import { milesToM, fmt } from "@/lib/units";

type Method = "cooper" | "resting" | "mile15";

export default function Vo2Max() {
  const { units } = useUnits();
  const [method, setMethod] = useState<Method>("cooper");
  const [age, setAge] = useState(DEFAULTS.age);
  const [sex, setSex] = useState<"male" | "female">(DEFAULTS.sex);

  // Cooper: distance covered in 12 min. Stored in display distance unit.
  const [coopDist, setCoopDist] = useState(units === "metric" ? 2400 : 1.5);
  // 1.5-mile run time in minutes.
  const [mileTime, setMileTime] = useState(11);
  // Resting method uses your resting HR + estimated max HR.
  const [restingHR, setRestingHR] = useState(DEFAULTS.restingHR);

  let vo2 = 0;
  if (method === "cooper") {
    // Cooper formula needs meters; convert if imperial (entered as miles).
    const meters = units === "metric" ? coopDist : milesToM(coopDist);
    vo2 = vo2maxCooper(meters);
  } else if (method === "mile15") {
    vo2 = vo2maxMileAndHalf(mileTime);
  } else {
    vo2 = vo2maxRestingHR(maxHRTanaka(age), restingHR);
  }

  const category = vo2maxCategory(vo2, age, sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Test</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <NumberInput value={age} onChange={setAge} />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={sex}
                onChange={setSex}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
          </div>
          <Field label="Method">
            <Select
              value={method}
              onChange={setMethod}
              options={[
                { value: "cooper", label: "Cooper 12-minute test (most accurate)" },
                { value: "mile15", label: "1.5-mile run" },
                { value: "resting", label: "Resting HR (no running needed)" },
              ]}
            />
          </Field>
          <Tip>
            {method === "cooper"
              ? "Cooper is the most accurate field test if you have a track or measured route — run as far as you can in 12 minutes."
              : method === "mile15"
              ? "The 1.5-mile run is a fixed-distance alternative to Cooper — good if you'd rather pace a set distance than chase distance against a clock."
              : "The resting-HR method needs no exercise, just an accurate resting heart rate — handy for a quick estimate, but less precise than a run test."}
          </Tip>

          {method === "cooper" && (
            <Field
              label={`Distance in 12 min (${
                units === "metric" ? "m" : "mi"
              })`}
            >
              <NumberInput
                value={coopDist}
                onChange={setCoopDist}
                step={units === "metric" ? 50 : 0.1}
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
              <Field label="Resting HR (bpm)">
                <NumberInput value={restingHR} onChange={setRestingHR} suffix="bpm" />
              </Field>
              <p className="text-xs text-zinc-500">
                Uses estimated max HR of {fmt(maxHRTanaka(age), 0)} bpm (Tanaka,
                from your age {age}).
              </p>
            </>
          )}

          <Result
            label="Estimated VO₂max"
            value={fmt(vo2)}
            unit="ml/kg/min"
            sub={`Category for ${sex}, age ${age}`}
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
          Tip: a higher VO₂max means your heart and lungs deliver more oxygen to
          working muscles — the clearest single marker of aerobic fitness.
        </p>
      </Card>
    </CalcGrid>
  );
}
