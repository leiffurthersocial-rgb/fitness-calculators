"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import { biologicalAge, vo2maxRestingHR, maxHRTanaka } from "@/lib/formulas";
import { fmt, lengthUnit } from "@/lib/units";

type Method = "vo2max" | "restingHR";

export default function FitnessAge() {
  const { units } = useUnits();
  const lu = lengthUnit(units);
  const { profile, patch } = useProfile();
  const [method, setMethod] = useState<Method>(profile.vo2max > 0 ? "vo2max" : "restingHR");
  const [vo2, setVo2] = useState(profile.vo2max > 0 ? profile.vo2max : 42);
  const [smoker, setSmoker] = useState(false);

  // Estimate VO₂max from resting HR (Uth–Sørensen) when that method is chosen.
  const estimatedVo2 = vo2maxRestingHR(maxHRTanaka(profile.age), profile.restingHR);
  const vo2max = method === "vo2max" ? vo2 : estimatedVo2;

  const r = biologicalAge({
    vo2max,
    age: profile.age,
    sex: profile.sex,
    restingHR: profile.restingHR,
    bodyFatPct: profile.bodyFatPct,
    heightCm: profile.heightCm,
    waistCm: profile.waistCm,
    smoker,
  });

  const younger = r.deltaYears > 0;
  const tone = r.deltaYears >= 5 ? "accent" : r.deltaYears <= -5 ? "warn" : "neutral";

  // Factor breakdown: signed years. Negative keeps you young (green), positive
  // ages you (red). Shown as a horizontal bar around a zero line.
  const FACTOR_LABEL: Record<string, string> = {
    vo2max: "Aerobic fitness",
    rhr: "Resting HR",
    bodyfat: "Body fat",
    whtr: "Waist-to-height",
    smoker: "Smoking",
  };
  const chart = r.factors
    .filter((f) => Math.abs(f.years) >= 0.05)
    .map((f) => ({ name: FACTOR_LABEL[f.key] ?? f.label, years: Math.round(f.years * 10) / 10 }));

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your markers</CardTitle>
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
          <Field label="Fitness from">
            <SegmentedControl
              value={method}
              onChange={setMethod}
              options={[
                { value: "vo2max", label: "VO₂max" },
                { value: "restingHR", label: "Resting HR" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {method === "vo2max" && (
              <Field label="VO₂max" hint="from the VO₂ max tool">
                <NumberInput value={vo2} onChange={setVo2} suffix="ml/kg/min" />
              </Field>
            )}
            <Field label="Resting HR" hint={method === "restingHR" ? "estimates VO₂max" : undefined}>
              <NumberInput value={profile.restingHR} onChange={(v) => patch({ restingHR: v })} suffix="bpm" />
            </Field>
            <Field label="Body fat %">
              <NumberInput value={profile.bodyFatPct} onChange={(v) => patch({ bodyFatPct: v })} suffix="%" />
            </Field>
            <Field label={`Waist (${lu})`} hint="optional — sharpens it">
              <NumberInput
                value={profile.waistCm > 0 ? Number((units === "metric" ? profile.waistCm : profile.waistCm / 2.54).toFixed(1)) : 0}
                onChange={(v) => patch({ waistCm: v ? (units === "metric" ? v : v * 2.54) : 0 })}
                suffix={lu}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={smoker}
              onChange={(e) => setSmoker(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent-500)]"
            />
            <span className="text-sm font-medium">I smoke</span>
          </label>
        </div>
        <InfoNote>
          <p>
            VO₂max sets the baseline — it&rsquo;s the single strongest predictor of
            longevity — giving the age at which your aerobic fitness would be
            merely average. Then resting heart rate, body fat, waist-to-height and
            smoking each nudge the number up or down within capped ranges.
          </p>
          <p>
            It&rsquo;s a motivational estimate built from population averages, not a
            clinical biomarker age. Fill in <strong>Your stats</strong> in the
            sidebar (VO₂max, resting HR, waist) to sharpen it.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your biological age</CardTitle>
        <Result
          label="Biological age"
          value={r.biologicalAge}
          unit="years"
          sub={
            r.deltaYears === 0
              ? "right on your calendar age"
              : `${Math.abs(r.deltaYears)} years ${younger ? "younger" : "older"} than your calendar age`
          }
        />
        <div className="mt-3">
          <Badge tone={tone}>
            {younger ? "Ageing well" : r.deltaYears === 0 ? "On par for your age" : "Room to improve"}
          </Badge>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-zinc-500">
            What&rsquo;s moving your age (years)
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} className="text-zinc-400" />
                <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: "currentColor" }} className="text-zinc-500" />
                <ReferenceLine x={0} stroke="currentColor" className="text-zinc-300 dark:text-zinc-700" />
                <Tooltip
                  formatter={(v) => [`${Number(v) > 0 ? "+" : ""}${fmt(Number(v), 1)} yr`, ""]}
                  contentStyle={{ borderRadius: 12, border: "none", background: "#18181b", color: "#fff", fontSize: 12 }}
                />
                <Bar dataKey="years" radius={[0, 4, 4, 0]}>
                  {chart.map((d) => (
                    <Cell key={d.name} fill={d.years <= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-400">
            Green keeps you young; red adds years. Aerobic fitness is the biggest
            lever — raising VO₂max by ~3.5 ml/kg/min (one MET) is a meaningful drop.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Aerobic fitness age" value={r.fitnessAgeBase} unit="yr" />
          <Stat label="Your VO₂max" value={fmt(vo2max, 1)} unit="ml/kg/min" />
        </div>
      </Card>
    </CalcGrid>
  );
}
