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
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { DEFAULTS } from "@/lib/defaults";
import { useProfile, useWeightField } from "@/lib/profile";
import {
  LIFTS,
  STRENGTH_LEVELS,
  SPORTS,
  classifyLift,
  type Lift,
  type Emphasis,
} from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

// Colour per level: Beginner → Elite.
const LEVEL_COLORS = ["#94a3b8", "#34d399", "#10b981", "#f59e0b", "#a855f7"];

const EMPHASIS_LABEL: Record<Emphasis, string> = {
  absolute: "Absolute strength",
  relative: "Strength-to-weight",
  power: "Explosive power",
  balanced: "Balanced",
};

// Sensible starting values so the tool isn't empty: weight lifts as a multiple
// of bodyweight, pull-ups as an absolute rep count.
const SEED_WEIGHT_RATIO: Record<Exclude<Lift, "pullup">, number> = {
  squat: 1.0,
  bench: 0.75,
  deadlift: 1.25,
  ohp: 0.5,
};
const SEED_PULLUP_REPS = 8;

export default function StrengthStandards() {
  const { units } = useUnits();
  const unit = weightUnit(units);

  const { profile, patch, patchLifts } = useProfile();
  const { sex, age } = profile;
  const [bw, setBw] = useWeightField(units);
  const [sportKey, setSportKey] = useState("general");

  // Per-lift inputs: weight lifts in the display unit, pull-ups in reps —
  // synced with the shared profile, falling back to a sensible seed before
  // anything's been entered there.
  const lifts: Record<Lift, number> = useMemo(() => {
    const bwDisp = weightFromKg(DEFAULTS.bodyweightKg, units);
    return Object.fromEntries(
      LIFTS.map((l) => {
        if (l.unit === "reps") return [l.key, profile.lifts.pullups || SEED_PULLUP_REPS];
        const kg = profile.lifts[l.key as Exclude<Lift, "pullup">];
        return [
          l.key,
          kg > 0
            ? Number(weightFromKg(kg, units).toFixed(1))
            : Math.round(bwDisp * SEED_WEIGHT_RATIO[l.key as Exclude<Lift, "pullup">]),
        ];
      })
    ) as Record<Lift, number>;
  }, [profile.lifts, units]);

  const sport = SPORTS.find((s) => s.key === sportKey)!;
  const bwKg = weightToKg(bw, units);

  // Classify every lift once, then derive an overall level and big-3 total.
  const classed = LIFTS.map((lift) => ({
    lift,
    c: classifyLift(
      lift.unit === "reps" ? lifts[lift.key] : weightToKg(lifts[lift.key], units),
      lift.key,
      sex,
      bwKg,
      age
    ),
  }));
  const avgIdx = classed.reduce((s, x) => s + x.c.levelIndex, 0) / classed.length;
  const overallIdx = Math.round(avgIdx);
  const overallLevel = overallIdx < 0 ? "Untrained" : STRENGTH_LEVELS[Math.min(4, overallIdx)];
  const overallColor = overallIdx < 0 ? "#71717a" : LEVEL_COLORS[Math.min(4, overallIdx)];
  const big3Keys: Lift[] = ["squat", "bench", "deadlift"];
  const big3Total = big3Keys.reduce((s, k) => s + (lifts[k] || 0), 0);
  const big3Kg = weightToKg(big3Total, units);

  // Sport-specific level: same averaging, but only over the sport's key lifts.
  const sportClassed = classed.filter((x) => sport.lifts.includes(x.lift.key));
  const sportAvgIdx =
    sportClassed.reduce((s, x) => s + x.c.levelIndex, 0) / sportClassed.length;
  const sportIdx = Math.round(sportAvgIdx);
  const sportLevel = sportIdx < 0 ? "Untrained" : STRENGTH_LEVELS[Math.min(4, sportIdx)];
  const sportColor = sportIdx < 0 ? "#71717a" : LEVEL_COLORS[Math.min(4, sportIdx)];
  const sportTargetIdx = STRENGTH_LEVELS.indexOf(sport.target);
  const meetsSportTarget = sportIdx >= sportTargetIdx;

  return (
    <CalcGrid>
      <Card>
        <CardTitle>About you</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <NumberInput value={age} onChange={(v) => patch({ age: v })} />
            </Field>
            <Field label="Sex">
              <SegmentedControl
                value={sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
          </div>
          <Field label={`Bodyweight (${unit})`}>
            <NumberInput value={bw} onChange={setBw} suffix={unit} />
          </Field>
          {/* bw is the shared profile weight; setBw writes back to it. */}
          <Field label="Sport / goal">
            <Select
              value={sportKey}
              onChange={setSportKey}
              options={SPORTS.map((s) => ({ value: s.key, label: s.label }))}
            />
          </Field>

          {/* Sport guidance */}
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge>{EMPHASIS_LABEL[sport.emphasis]}</Badge>
              <Badge tone="neutral">Target: {sport.target}</Badge>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{sport.note}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-zinc-400">Key lifts:</span>
              {sport.lifts.map((l) => (
                <span key={l} className="text-xs font-medium text-accent-600 dark:text-accent-400">
                  {LIFTS.find((x) => x.key === l)?.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <InfoNote>
          <p>
            Barbell standards are a 1RM as a multiple of bodyweight; pull-ups
            are max strict reps. Both are adjusted for your age (strength peaks
            ~23–30, then declines) and your bodyweight — lighter lifters are held
            to a higher bar, heavier lifters a lower one, like Wilks/DOTS.
          </p>
          <p>
            For pull-ups specifically, bodyweight <em>is</em> the resistance, so
            it&apos;s weighted even more heavily than the barbell lifts — the
            &quot;relative&quot; figure converts your reps to what a reference
            80&nbsp;kg (male) / 65&nbsp;kg (female) lifter would&apos;ve needed to
            match you, so e.g. 9 reps at 70&nbsp;kg outranks 10 reps at 40&nbsp;kg.
          </p>
          <p>
            Levels run Beginner → Novice → Intermediate → Advanced → Elite.
            Figures are approximate, synthesised from common public tables — a
            guide, not a verdict.
          </p>
          <p>
            The &quot;top X%&quot; figure estimates where you sit among people
            who train that lift, interpolated between the level thresholds.
            The sport-specific level above your lifts only averages the
            lifts that actually matter for your chosen sport, so it can read
            differently from your overall level.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your lifts</CardTitle>
        <Tip>
          For <strong>{sport.label.toLowerCase()}</strong>, prioritise the
          highlighted lifts and aim for at least{" "}
          <strong>{sport.target}</strong>{" "}
          {sport.emphasis === "relative"
            ? "while keeping your bodyweight in check."
            : sport.emphasis === "power"
            ? "with explosive intent on every rep."
            : "level."}
        </Tip>

        {/* Overall summary */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <div className="text-xs text-zinc-500">Overall strength level</div>
            <div className="text-lg font-bold" style={{ color: overallColor }}>
              {overallLevel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Squat + bench + deadlift</div>
            <div className="text-lg font-semibold">
              {fmt(big3Total)} {unit}
              <span className="ml-1 text-sm font-normal text-zinc-400">
                · {fmt(big3Kg / bwKg, 2)}×BW
              </span>
            </div>
          </div>
        </div>

        {/* Sport-specific summary, based only on the sport's key lifts */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <div className="text-xs text-zinc-500">{sport.label} level (key lifts)</div>
            <div className="text-lg font-bold" style={{ color: sportColor }}>
              {sportLevel}
            </div>
          </div>
          <Badge tone={meetsSportTarget ? "accent" : "warn"}>
            {meetsSportTarget ? `Meets ${sport.target} target` : `Target: ${sport.target}`}
          </Badge>
        </div>

        <div className="mt-4 space-y-5">
          {classed.map(({ lift, c }) => {
            const isKey = sport.lifts.includes(lift.key);
            const isReps = lift.unit === "reps";

            const levelColor =
              c.levelIndex < 0 ? "#71717a" : LEVEL_COLORS[c.levelIndex];

            return (
              <div key={lift.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {lift.label}
                      {isKey && <Badge>key lift</Badge>}
                    </span>
                    {lift.hint && (
                      <span className="text-xs text-zinc-400">{lift.hint}</span>
                    )}
                  </span>
                  <div className="w-28">
                    <NumberInput
                      value={lifts[lift.key]}
                      onChange={(v) =>
                        patchLifts(
                          lift.unit === "reps"
                            ? { pullups: v }
                            : { [lift.key]: v ? weightToKg(v, units) : 0 }
                        )
                      }
                      step={isReps ? 1 : 2.5}
                      suffix={isReps ? "reps" : unit}
                    />
                  </div>
                </div>

                {/* Level bar */}
                <div className="relative">
                  <div className="flex h-3 overflow-hidden rounded-full">
                    {LEVEL_COLORS.map((col, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: col }} />
                    ))}
                  </div>
                  {/* User marker */}
                  <div
                    className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded bg-zinc-900 ring-2 ring-white dark:bg-white dark:ring-zinc-900"
                    style={{ left: `calc(${c.barPct * 100}% - 2px)` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span
                    className="font-semibold"
                    style={{ color: levelColor }}
                  >
                    {c.level}
                    {isReps
                      ? ` · ${lifts[lift.key]} reps (≈${fmt(c.relativeReps ?? 0, 1)} relative)`
                      : ` · ${fmt(c.ratio, 2)}×BW`}
                    <span className="ml-1 font-normal text-zinc-400">
                      · top {fmt(100 - c.percentile, 1)}%
                    </span>
                  </span>
                  <span className="text-zinc-500">
                    {c.next
                      ? isReps
                        ? `${Math.ceil(c.toNext)} ${Math.ceil(c.toNext) === 1 ? "rep" : "reps"} to ${c.next.level}`
                        : `${fmt(weightFromKg(c.toNext, units))} ${unit} to ${c.next.level}`
                      : "Top tier 💪"}
                  </span>
                </div>
                {isKey && (
                  <div className="mt-1 text-xs">
                    {c.levelIndex >= sportTargetIdx ? (
                      <span className="text-accent-600 dark:text-accent-400">
                        Meets the {sport.target} target for {sport.label.toLowerCase()} ✓
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Below the {sport.target} target for {sport.label.toLowerCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {STRENGTH_LEVELS.map((lvl, i) => (
            <span key={lvl} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LEVEL_COLORS[i] }}
              />
              {lvl}
            </span>
          ))}
        </div>
      </Card>
    </CalcGrid>
  );
}
