"use client";

import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  Badge,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import {
  useProfile,
  useWeightField,
  useHeightField,
} from "@/lib/profile";
import { athleteScore } from "@/lib/score";
import {
  weightFromKg,
  weightToKg,
  lengthToCm,
  weightUnit,
  smallLengthUnit,
} from "@/lib/units";

// Score (0–1000) → colour, matching the build-rater palette.
function scoreColor(s: number): string {
  if (s >= 800) return "#a855f7";
  if (s >= 650) return "#10b981";
  if (s >= 500) return "#34d399";
  if (s >= 350) return "#f59e0b";
  return "#ef4444";
}
// Pillar sub-scores are 0–100.
function pillarColor(s: number): string {
  if (s >= 80) return "#a855f7";
  if (s >= 65) return "#10b981";
  if (s >= 50) return "#34d399";
  if (s >= 35) return "#f59e0b";
  return "#ef4444";
}

const LIFTS: { key: "squat" | "bench" | "deadlift" | "ohp"; label: string }[] = [
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench" },
  { key: "deadlift", label: "Deadlift" },
  { key: "ohp", label: "Overhead" },
];

export default function AthleteScore() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const su = smallLengthUnit(units);
  const { profile, patch, patchLifts } = useProfile();
  const [weight, setWeight] = useWeightField(units);
  const [height, setHeight] = useHeightField(units);

  // Power inputs live here (not in the shared profile).
  const [vertical, setVertical] = useState(0);
  const [broad, setBroad] = useState(0);

  const liftDisp = (kg: number) => (kg > 0 ? Number(weightFromKg(kg, units).toFixed(1)) : 0);

  const result = athleteScore({
    sex: profile.sex,
    age: profile.age,
    heightCm: lengthToCm(height, units),
    weightKg: weightToKg(weight, units),
    bodyFatPct: profile.bodyFatPct,
    lifts: profile.lifts,
    vo2max: profile.vo2max,
    verticalCm: vertical ? lengthToCm(vertical, units) : 0,
    broadCm: broad ? lengthToCm(broad, units) : 0,
  });

  const ring = scoreColor(result.overall);
  const radarData = result.pillars.map((p) => ({ pillar: p.label, score: p.score ?? 0 }));

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your stats</CardTitle>
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
            <Field label={`Height (${units === "metric" ? "cm" : "in"})`}>
              <NumberInput value={height} onChange={setHeight} />
            </Field>
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
            <Field label="Body fat %">
              <NumberInput value={profile.bodyFatPct} onChange={(v) => patch({ bodyFatPct: v })} suffix="%" />
            </Field>
            <Field label="VO₂max" hint="endurance">
              <NumberInput value={profile.vo2max} onChange={(v) => patch({ vo2max: v })} suffix="ml/kg/min" />
            </Field>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Lifts{" "}
              <span className="font-normal text-zinc-400">(strength — saved to your profile)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {LIFTS.map((l) => (
                <Field key={l.key} label={`${l.label} 1RM (${wu})`}>
                  <NumberInput
                    value={liftDisp(profile.lifts[l.key])}
                    onChange={(v) => patchLifts({ [l.key]: v ? weightToKg(v, units) : 0 })}
                    step={2.5}
                    suffix={wu}
                  />
                </Field>
              ))}
              <Field label="Max pull-ups">
                <NumberInput value={profile.lifts.pullups} onChange={(v) => patchLifts({ pullups: v })} suffix="reps" />
              </Field>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Power{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Vertical jump (${su})`}>
                <NumberInput value={vertical} onChange={setVertical} suffix={su} />
              </Field>
              <Field label={`Broad jump (${su})`} hint="standing long jump">
                <NumberInput value={broad} onChange={setBroad} suffix={su} />
              </Field>
            </div>
          </div>
        </div>
        <InfoNote>
          <p>
            Four pillars are each scored as an age-, sex- and bodyweight-fair
            percentile: <strong>strength</strong> (your lifts vs standards),{" "}
            <strong>endurance</strong> (VO₂max), <strong>body composition</strong>{" "}
            (muscularity + leanness) and <strong>power</strong> (jumps).
          </p>
          <p>
            The overall is their weighted average ×10, over only the pillars you
            fill in — so a median, healthy trainee lands near 500, and the more you
            enter, the truer it gets.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your athlete score</CardTitle>
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={ring} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - result.overall / 1000)}
                style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{result.overall}</span>
              <span className="text-xs text-zinc-400">/ 1000</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={result.overall >= 500 ? "accent" : "warn"}>{result.tier}</Badge>
              <span
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                title="How much of the four pillars you've measured"
              >
                {result.confidencePct}% measured
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Roughly the <strong>{result.percentile}th</strong> percentile across
              the pillars you entered.
            </p>
          </div>
        </div>

        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid className="stroke-zinc-200 dark:stroke-zinc-700" />
              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 12, fill: "currentColor" }} className="text-zinc-500" />
              <Radar dataKey="score" stroke={ring} fill={ring} fillOpacity={0.35} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 space-y-2.5">
          {result.pillars.map((p) => (
            <div key={p.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="flex items-center gap-2">
                  {p.weight > 0 && <span className="text-zinc-400">{Math.round(p.weight * 100)}% weight</span>}
                  <span
                    className="w-6 text-right font-semibold tabular-nums"
                    style={{ color: p.score == null ? "#a1a1aa" : pillarColor(p.score) }}
                  >
                    {p.score == null ? "—" : p.score}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.score ?? 0}%`, backgroundColor: p.score == null ? "transparent" : pillarColor(p.score) }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {result.guidance.map((g, i) => (
            <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-accent-500">•</span>
              {g}
            </p>
          ))}
        </div>
      </Card>
    </CalcGrid>
  );
}
