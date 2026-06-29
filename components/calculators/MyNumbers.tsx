"use client";

import { Card, CardTitle, CalcGrid, Badge, EmptyHint } from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile } from "@/lib/profile";
import {
  bmi,
  bmiCategory,
  bmrMifflin,
  tdee,
  ffmi,
  ffmiCategory,
  muscleGainPotential,
  healthyWeightRange,
  maxHRTanaka,
  hrZones,
  waterTargetMl,
  strengthScore,
  biologicalAge,
  type Lift,
  TRAINING_LEVELS,
} from "@/lib/formulas";
import { athleteScore } from "@/lib/score";
import { weightFromKg, weightUnit, fmt } from "@/lib/units";

// Jump to another tool by setting the URL hash; the shell listens for it.
function go(id: string) {
  window.location.hash = id;
}

function MetricCard({
  label,
  value,
  unit,
  sub,
  toolId,
  toolName,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: React.ReactNode;
  toolId: string;
  toolName: string;
}) {
  return (
    <button
      type="button"
      onClick={() => go(toolId)}
      className="group flex flex-col rounded-xl border border-zinc-200 p-3 text-left transition hover:border-accent-400 hover:shadow-sm dark:border-zinc-800 dark:hover:border-accent-600"
    >
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="mt-0.5 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-zinc-400">{unit}</span>}
      </span>
      {sub && <span className="mt-0.5 text-xs text-zinc-500">{sub}</span>}
      <span className="mt-2 text-xs font-medium text-accent-600 opacity-0 transition group-hover:opacity-100 dark:text-accent-400">
        Open {toolName} →
      </span>
    </button>
  );
}

export default function MyNumbers() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile } = useProfile();
  const { age, sex, heightCm, weightKg, bodyFatPct, restingHR, experience, vo2max, waistCm, lifts } = profile;

  const disp = (kg: number) => fmt(weightFromKg(kg, units), 1);

  const bmiVal = bmi(weightKg, heightCm);
  const bmr = bmrMifflin(weightKg, heightCm, age, sex);
  const maint = tdee(bmr, 1.55);
  const f = ffmi(weightKg, heightCm, bodyFatPct);
  const mg = muscleGainPotential({ sex, age, heightCm, weightKg, bodyFatPct, level: experience });
  const year = mg.timeframes.find((t) => t.months === 12)!;
  const range = healthyWeightRange(heightCm);
  const maxHR = maxHRTanaka(age);
  const z2 = hrZones(maxHR, restingHR, "karvonen")[1];
  const water = waterTargetMl({ bodyweightKg: weightKg, exerciseHours: 0, hotClimate: false });

  const yearRange =
    Math.round(year.loKg * 10) === Math.round(year.highKg * 10)
      ? disp(year.highKg)
      : `${disp(year.loKg)}–${disp(year.highKg)}`;
  const expLabel = TRAINING_LEVELS.find((t) => t.key === experience)?.label ?? "";

  // ---- Performance & athleticism (from the saved lifts / VO₂max) ----
  const hasLifts = lifts.squat > 0 || lifts.bench > 0 || lifts.deadlift > 0 || lifts.ohp > 0 || lifts.pullups > 0;
  const liftValues: Partial<Record<Lift, number>> = {
    squat: lifts.squat || undefined,
    bench: lifts.bench || undefined,
    deadlift: lifts.deadlift || undefined,
    ohp: lifts.ohp || undefined,
    pullup: lifts.pullups || undefined,
  };
  const strength = hasLifts ? strengthScore(liftValues, sex, weightKg, age) : null;
  const aScore = athleteScore({ sex, age, heightCm, weightKg, bodyFatPct, lifts, vo2max });
  const bio = vo2max > 0 ? biologicalAge({ vo2max, age, sex, restingHR, bodyFatPct, heightCm, waistCm }) : null;

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your snapshot</CardTitle>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Computed live from <strong>Your stats</strong> in the sidebar —{" "}
          {sex === "male" ? "male" : "female"}, {age}y, {disp(weightKg)}&nbsp;{wu} at{" "}
          {fmt(bodyFatPct)}% body fat. Edit them once and every tool updates. Tap any
          card to open the full calculator.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Maintenance calories"
            value={fmt(maint, 0)}
            unit="kcal"
            sub={`BMR ${fmt(bmr, 0)} · moderate activity`}
            toolId="tdee"
            toolName="TDEE"
          />
          <MetricCard
            label="BMI"
            value={fmt(bmiVal)}
            sub={<Badge tone={bmiCategory(bmiVal) === "Normal" ? "accent" : "warn"}>{bmiCategory(bmiVal)}</Badge>}
            toolId="body-comp"
            toolName="Body composition"
          />
          <MetricCard
            label="Normalised FFMI"
            value={fmt(f.normalizedFfmi, 1)}
            sub={ffmiCategory(f.normalizedFfmi, sex)}
            toolId="ffmi"
            toolName="FFMI"
          />
          <MetricCard
            label="Lean mass"
            value={disp(f.leanMassKg)}
            unit={wu}
            sub={`${fmt(mg.pctOfPotential, 0)}% toward your ceiling`}
            toolId="muscle-gain"
            toolName="Muscle-gain potential"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Goals & targets</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Muscle in 12 months"
            value={mg.remainingKg < 0.1 ? "≈ 0" : `+${yearRange}`}
            unit={mg.remainingKg < 0.1 ? undefined : wu}
            sub={`${expLabel} rate`}
            toolId="muscle-gain"
            toolName="Muscle-gain potential"
          />
          <MetricCard
            label="Healthy weight"
            value={`${disp(range.minKg)}–${disp(range.maxKg)}`}
            unit={wu}
            sub="BMI 18.5–24.9 for your height"
            toolId="ideal-weight"
            toolName="Ideal weight"
          />
          <MetricCard
            label="Max heart rate"
            value={fmt(maxHR, 0)}
            unit="bpm"
            sub={`Zone 2: ${fmt(z2.lowBpm, 0)}–${fmt(z2.highBpm, 0)} bpm`}
            toolId="hr-zones"
            toolName="Heart-rate zones"
          />
          <MetricCard
            label="Water target"
            value={fmt(water / 1000, 2)}
            unit="L"
            sub="baseline, before exercise"
            toolId="water"
            toolName="Water intake"
          />
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Strength level, VO₂max and race paces need a test result — open the{" "}
          <button onClick={() => go("standards")} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            Strength standards
          </button>
          ,{" "}
          <button onClick={() => go("vo2max")} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            VO₂ max
          </button>{" "}
          or{" "}
          <button onClick={() => go("run-paces")} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            Run paces
          </button>{" "}
          tools to fill those in.
        </p>
      </Card>

      <Card>
        <CardTitle>Performance &amp; athleticism</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Athlete score"
            value={String(aScore.overall)}
            unit="/ 1000"
            sub={<Badge tone={aScore.overall >= 500 ? "accent" : "warn"}>{aScore.tier}</Badge>}
            toolId="athlete-score"
            toolName="Athlete score"
          />
          {strength && (
            <MetricCard
              label="Strength score"
              value={fmt(strength.score, 0)}
              unit="/ 100"
              sub={strength.level}
              toolId="standards"
              toolName="Strength standards"
            />
          )}
          {bio && (
            <MetricCard
              label="Biological age"
              value={String(bio.biologicalAge)}
              unit="yr"
              sub={
                bio.deltaYears === 0
                  ? "on your calendar age"
                  : `${Math.abs(bio.deltaYears)} yr ${bio.deltaYears > 0 ? "younger" : "older"}`
              }
              toolId="fitness-age"
              toolName="Biological age"
            />
          )}
        </div>
        <div className="mt-4 space-y-2">
          {!hasLifts && (
            <EmptyHint actionLabel="Add lifts" onAction={() => go("athlete-score")}>
              Add your squat, bench, deadlift or pull-ups in <strong>Your stats</strong> to
              score strength.
            </EmptyHint>
          )}
          {vo2max <= 0 && (
            <EmptyHint actionLabel="Estimate VO₂max" onAction={() => go("vo2max")}>
              Add your VO₂max to unlock endurance and your biological age.
            </EmptyHint>
          )}
        </div>
      </Card>
    </CalcGrid>
  );
}
