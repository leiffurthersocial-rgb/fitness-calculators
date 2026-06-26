"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  InfoNote,
  CalcGrid,
  Badge,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { SPORTS_DB, rateBuild, type BuildInput } from "@/lib/buildRater";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  lengthUnit,
  fmt,
} from "@/lib/units";

// Score → colour for the gauge and bars.
function scoreColor(s: number): string {
  if (s >= 85) return "#a855f7";
  if (s >= 70) return "#10b981";
  if (s >= 58) return "#34d399";
  if (s >= 45) return "#f59e0b";
  return "#ef4444";
}

export default function SportsBuildRater() {
  const { profile } = useProfile();
  const wu = weightUnit(profile.units);
  const lu = lengthUnit(profile.units);

  const [sex, setSex] = useState<"male" | "female">(profile.sex);
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(profile.heightCm, profile.units))
  );
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(profile.bodyweightKg, profile.units))
  );
  const [sportKey, setSportKey] = useState("basketball");
  const sport = SPORTS_DB.find((s) => s.key === sportKey)!;
  const [posKey, setPosKey] = useState(sport.positions[0].key);

  // Lift inputs (display units; 0 = not provided). Pull-ups are reps.
  const [squat, setSquat] = useState(0);
  const [bench, setBench] = useState(0);
  const [deadlift, setDeadlift] = useState(0);
  const [ohp, setOhp] = useState(0);
  const [pullups, setPullups] = useState(0);

  // Keep the position valid when the sport changes.
  const position =
    sport.positions.find((p) => p.key === posKey) ?? sport.positions[0];

  const result = useMemo(() => {
    const input: BuildInput = {
      sex,
      heightCm: lengthToCm(height, profile.units),
      weightKg: weightToKg(weight, profile.units),
      squat: squat ? weightToKg(squat, profile.units) : 0,
      bench: bench ? weightToKg(bench, profile.units) : 0,
      deadlift: deadlift ? weightToKg(deadlift, profile.units) : 0,
      ohp: ohp ? weightToKg(ohp, profile.units) : 0,
      pullups,
    };
    return rateBuild(input, position);
  }, [sex, height, weight, squat, bench, deadlift, ohp, pullups, position, profile.units]);

  const onSport = (key: string) => {
    setSportKey(key);
    const s = SPORTS_DB.find((x) => x.key === key)!;
    setPosKey(s.positions[0].key);
  };

  const ring = scoreColor(result.overall);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>You & the role</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sport">
              <Select
                value={sportKey}
                onChange={onSport}
                options={SPORTS_DB.map((s) => ({ value: s.key, label: s.label }))}
              />
            </Field>
            <Field label="Position">
              <Select
                value={position.key}
                onChange={setPosKey}
                options={sport.positions.map((p) => ({ value: p.key, label: p.label }))}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            {position.note}
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Your lifts <span className="font-normal text-zinc-400">(optional — leave 0 to skip)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Squat 1RM (${wu})`}>
                <NumberInput value={squat} onChange={setSquat} step={2.5} suffix={wu} />
              </Field>
              <Field label={`Bench 1RM (${wu})`}>
                <NumberInput value={bench} onChange={setBench} step={2.5} suffix={wu} />
              </Field>
              <Field label={`Deadlift 1RM (${wu})`}>
                <NumberInput value={deadlift} onChange={setDeadlift} step={2.5} suffix={wu} />
              </Field>
              <Field label={`Overhead 1RM (${wu})`}>
                <NumberInput value={ohp} onChange={setOhp} step={2.5} suffix={wu} />
              </Field>
              <Field label="Max pull-ups">
                <NumberInput value={pullups} onChange={setPullups} suffix="reps" />
              </Field>
            </div>
          </div>
        </div>
        <InfoNote>
          <p>
            Two halves: <strong>anthropometry</strong> (how close your height &
            BMI sit to the role&apos;s typical range) and <strong>strength</strong>{" "}
            (your relative lifts vs target ratios). Each position weights the two
            differently — a centre is mostly height, a powerlifter is almost all
            strength.
          </p>
          <p>
            Norms are approximate elite-athlete averages, shifted for sex. It&apos;s
            a directional guide, not destiny.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your rating</CardTitle>

        {/* Overall gauge */}
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={ring} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - result.overall / 100)}
                style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{result.overall}</span>
              <span className="text-xs text-zinc-400">/ 100</span>
            </div>
          </div>
          <div>
            <Badge tone={result.overall >= 58 ? "accent" : "warn"}>{result.verdict}</Badge>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-24 text-zinc-500">Anthropometry</span>
                <span className="font-semibold">{result.anthropometryScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-zinc-500">Strength</span>
                <span className="font-semibold">
                  {result.strengthScore == null ? "—" : result.strengthScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-metric bars */}
        <div className="mt-5 space-y-2.5">
          {result.metrics.map((m) => (
            <div key={m.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span className="font-medium">{m.label}</span>
                <span className="text-zinc-400">{m.detail}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, m.score)}%`,
                    backgroundColor: scoreColor(m.score),
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="mt-5 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {result.feedback.map((f, i) => (
            <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-accent-500">•</span>
              {f}
            </p>
          ))}
        </div>

        <p className="mt-3 text-xs text-zinc-400">
          Typical for this role: {fmt(
            sex === "female" ? position.heightCm[0] - 11 : position.heightCm[0]
          ).replace(".0", "")}–
          {fmt(sex === "female" ? position.heightCm[1] - 11 : position.heightCm[1]).replace(".0", "")} cm,
          BMI {position.bmi[0]}–{position.bmi[1]}.
        </p>
      </Card>
    </CalcGrid>
  );
}
