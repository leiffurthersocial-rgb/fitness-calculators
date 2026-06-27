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
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import { SPORTS_DB, rateBuild, type BuildInput } from "@/lib/buildRater";
import {
  weightFromKg,
  weightToKg,
  lengthFromCm,
  lengthToCm,
  weightUnit,
  lengthUnit,
  smallLengthUnit,
  fmt,
} from "@/lib/units";

// A small section divider for grouping the optional performance inputs.
function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
      {children}
    </div>
  );
}

// Score → colour for the gauge and bars.
function scoreColor(s: number): string {
  if (s >= 85) return "#a855f7";
  if (s >= 70) return "#10b981";
  if (s >= 58) return "#34d399";
  if (s >= 45) return "#f59e0b";
  return "#ef4444";
}

export default function SportsBuildRater() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const lu = lengthUnit(units);
  const su = smallLengthUnit(units);

  const [sex, setSex] = useState<"male" | "female">(DEFAULTS.sex);
  const [age, setAge] = useState(DEFAULTS.age);
  const [height, setHeight] = useState(
    Math.round(lengthFromCm(DEFAULTS.heightCm, units))
  );
  const [weight, setWeight] = useState(
    Math.round(weightFromKg(DEFAULTS.bodyweightKg, units))
  );
  const [wingspan, setWingspan] = useState(0); // display length unit
  const [sportKey, setSportKey] = useState("basketball");
  const sport = SPORTS_DB.find((s) => s.key === sportKey)!;
  const [posKey, setPosKey] = useState(sport.positions[0].key);

  // Optional performance inputs (0 = not provided).
  const [squat, setSquat] = useState(0);
  const [bench, setBench] = useState(0);
  const [deadlift, setDeadlift] = useState(0);
  const [ohp, setOhp] = useState(0);
  const [pullups, setPullups] = useState(0);
  const [sprint100, setSprint100] = useState(0); // seconds
  const [vertical, setVertical] = useState(0); // display small-length unit
  const [vo2max, setVo2max] = useState(0); // ml/kg/min

  const position =
    sport.positions.find((p) => p.key === posKey) ?? sport.positions[0];

  // Sports where a long wingspan (reach) is a genuine advantage.
  const REACH_SPORTS = new Set(["basketball", "volleyball", "swimming", "combat"]);

  const result = useMemo(() => {
    const input: BuildInput = {
      sex,
      age,
      heightCm: lengthToCm(height, units),
      weightKg: weightToKg(weight, units),
      squat: squat ? weightToKg(squat, units) : 0,
      bench: bench ? weightToKg(bench, units) : 0,
      deadlift: deadlift ? weightToKg(deadlift, units) : 0,
      ohp: ohp ? weightToKg(ohp, units) : 0,
      pullups,
      sprint100,
      vertical: vertical ? lengthToCm(vertical, units) : 0,
      vo2max,
      wingspanCm: wingspan ? lengthToCm(wingspan, units) : 0,
      reach: REACH_SPORTS.has(sportKey),
    };
    return rateBuild(input, position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, age, height, weight, wingspan, squat, bench, deadlift, ohp, pullups, sprint100, vertical, vo2max, position, sportKey, units]);

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

          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Age">
              <NumberInput value={age} onChange={setAge} />
            </Field>
            <Field label={`Height (${lu})`}>
              <NumberInput value={height} onChange={setHeight} suffix={lu} />
            </Field>
            <Field label={`Weight (${wu})`}>
              <NumberInput value={weight} onChange={setWeight} suffix={wu} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Performance{" "}
              <span className="font-normal text-zinc-400">
                (all optional — leave 0 to skip)
              </span>
            </div>

            <SubLabel>💪 Strength</SubLabel>
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

            <SubLabel>⚡ Power</SubLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field label="100 m sprint">
                <NumberInput value={sprint100} onChange={setSprint100} step={0.1} suffix="s" />
              </Field>
              <Field label={`Vertical jump (${su})`}>
                <NumberInput value={vertical} onChange={setVertical} suffix={su} />
              </Field>
            </div>

            <SubLabel>🫀 Endurance &amp; reach</SubLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field label="VO₂max">
                <NumberInput value={vo2max} onChange={setVo2max} suffix="ml/kg/min" />
              </Field>
              <Field
                label={`Wingspan (${lu})`}
                hint={REACH_SPORTS.has(sportKey) ? "matters here" : undefined}
              >
                <NumberInput value={wingspan} onChange={setWingspan} suffix={lu} />
              </Field>
            </div>
          </div>
        </div>
        <InfoNote>
          <p>
            Four groups are scored: <strong>physique</strong> (height, BMI &
            wingspan vs the role&apos;s range), <strong>strength</strong>{" "}
            (relative lifts & pull-ups), <strong>power</strong> (100 m &amp;
            vertical) and <strong>endurance</strong> (VO₂max).
          </p>
          <p>
            Each position weights the groups by what it demands, and the overall
            is the weighted average over only the groups you fill in — so the more
            you enter, the more accurate it gets. Targets are{" "}
            <strong>age-adjusted</strong> and shifted for sex; wingspan rewards
            reach in sports like basketball, volleyball and swimming.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your rating</CardTitle>

        {/* Overall gauge + group scores */}
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
          <div className="flex-1">
            <Badge tone={result.overall >= 58 ? "accent" : "warn"}>{result.verdict}</Badge>
            <div className="mt-2 space-y-1 text-sm">
              {result.groups.map((g) => (
                <div key={g.group} className="flex items-center gap-2">
                  <span className="w-20 text-zinc-500">{g.label}</span>
                  <span className="font-semibold tabular-nums">
                    {g.score == null ? "—" : g.score}
                  </span>
                  {g.score != null && g.weight > 0 && (
                    <span className="text-xs text-zinc-400">
                      ·{Math.round(g.weight * 100)}% weight
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Limiter / standout insight */}
        {(result.limiter || result.standout) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {result.standout && (
              <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 dark:border-accent-800 dark:bg-accent-900/20">
                <div className="text-xs text-zinc-500">Standout</div>
                <div className="text-sm font-semibold text-accent-700 dark:text-accent-300">
                  {result.standout.label} · {result.standout.score}
                </div>
              </div>
            )}
            {result.limiter && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-900/20">
                <div className="text-xs text-zinc-500">Biggest limiter</div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {result.limiter.label} · {result.limiter.score}
                </div>
              </div>
            )}
          </div>
        )}

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
          Typical for this role:{" "}
          {fmt(sex === "female" ? position.heightCm[0] - 11 : position.heightCm[0]).replace(".0", "")}
          –
          {fmt(sex === "female" ? position.heightCm[1] - 11 : position.heightCm[1]).replace(".0", "")} cm,
          BMI {position.bmi[0]}–{position.bmi[1]}.
        </p>
      </Card>
    </CalcGrid>
  );
}
