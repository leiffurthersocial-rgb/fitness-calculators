"use client";

import { useState } from "react";
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

// Sensible starting 1RMs as a multiple of bodyweight, so the tool isn't empty.
const SEED_RATIO: Record<Lift, number> = {
  squat: 1.0,
  bench: 0.75,
  deadlift: 1.25,
  ohp: 0.5,
};

export default function StrengthStandards() {
  const { units } = useUnits();
  const unit = weightUnit(units);

  const [sex, setSex] = useState<"male" | "female">(DEFAULTS.sex);
  const [age, setAge] = useState(DEFAULTS.age);
  const [bw, setBw] = useState(
    Math.round(weightFromKg(DEFAULTS.bodyweightKg, units))
  );
  const [sportKey, setSportKey] = useState("general");

  // Per-lift 1RM inputs, in the display unit.
  const [lifts, setLifts] = useState<Record<Lift, number>>(() => {
    const bwDisp = weightFromKg(DEFAULTS.bodyweightKg, units);
    return {
      squat: Math.round(bwDisp * SEED_RATIO.squat),
      bench: Math.round(bwDisp * SEED_RATIO.bench),
      deadlift: Math.round(bwDisp * SEED_RATIO.deadlift),
      ohp: Math.round(bwDisp * SEED_RATIO.ohp),
    };
  });

  const sport = SPORTS.find((s) => s.key === sportKey)!;
  const bwKg = weightToKg(bw, units);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>About you</CardTitle>
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
          <Field label={`Bodyweight (${unit})`}>
            <NumberInput value={bw} onChange={setBw} suffix={unit} />
          </Field>
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
            Standards are a 1RM as a multiple of bodyweight, adjusted for your
            age (strength peaks ~23–30, then declines gradually).
          </p>
          <p>
            Levels run Beginner → Novice → Intermediate → Advanced → Elite.
            Figures are approximate, synthesised from common public tables — a
            guide, not a verdict.
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

        <div className="mt-4 space-y-5">
          {LIFTS.map((lift) => {
            const isKey = sport.lifts.includes(lift.key);
            const oneRMkg = weightToKg(lifts[lift.key], units);
            const c = classifyLift(oneRMkg, lift.key, sex, bwKg, age);

            // Marker position between Beginner (0%) and Elite (100%).
            const beg = c.rows[0].weight;
            const elite = c.rows[4].weight;
            const pct =
              elite > beg
                ? Math.min(1, Math.max(0, (oneRMkg - beg) / (elite - beg)))
                : 0;
            const levelColor =
              c.levelIndex < 0 ? "#71717a" : LEVEL_COLORS[c.levelIndex];

            return (
              <div key={lift.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {lift.label}
                    {isKey && <Badge>key lift</Badge>}
                  </span>
                  <div className="w-28">
                    <NumberInput
                      value={lifts[lift.key]}
                      onChange={(v) =>
                        setLifts((prev) => ({ ...prev, [lift.key]: v }))
                      }
                      step={2.5}
                      suffix={unit}
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
                    style={{ left: `calc(${pct * 100}% - 2px)` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span
                    className="font-semibold"
                    style={{ color: levelColor }}
                  >
                    {c.level} · {fmt(c.ratio, 2)}×BW
                  </span>
                  <span className="text-zinc-500">
                    {c.next
                      ? `${fmt(weightFromKg(c.toNextKg, units))} ${unit} to ${c.next.level}`
                      : "Top tier 💪"}
                  </span>
                </div>
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
