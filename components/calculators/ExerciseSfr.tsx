"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import {
  exerciseRating,
  type LengthBias,
  type Pattern,
  type Rom,
  type Stability,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * Exercise stimulus-to-fatigue rater. Two exercises can train the same muscle
 * and cost wildly different amounts of fatigue to do it — this prices that
 * difference, so you know which movements to build volume on and which to do
 * first, hard, and few.
 */

interface ExerciseSpec {
  pattern: Pattern;
  stability: Stability;
  lengthBias: LengthBias;
  rom: Rom;
  axial: boolean;
  muscles: number;
}

interface Preset extends ExerciseSpec {
  name: string;
}

/** Common lifts described in the model's terms. */
const PRESETS: Preset[] = [
  { name: "Back squat", pattern: "compound", stability: "free", lengthBias: "lengthened", rom: "full", axial: true, muscles: 2 },
  { name: "Hack squat / pendulum", pattern: "compound", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Leg press", pattern: "compound", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Bulgarian split squat", pattern: "compound", stability: "free", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Leg extension", pattern: "isolation", stability: "supported", lengthBias: "mid", rom: "full", axial: false, muscles: 1 },
  { name: "Conventional deadlift", pattern: "compound", stability: "free", lengthBias: "mid", rom: "full", axial: true, muscles: 3 },
  { name: "Romanian deadlift", pattern: "compound", stability: "free", lengthBias: "lengthened", rom: "full", axial: true, muscles: 2 },
  { name: "Seated leg curl", pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 1 },
  { name: "Barbell bench press", pattern: "compound", stability: "free", lengthBias: "mid", rom: "full", axial: false, muscles: 2 },
  { name: "Incline dumbbell press", pattern: "compound", stability: "free", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Machine chest press", pattern: "compound", stability: "supported", lengthBias: "mid", rom: "full", axial: false, muscles: 2 },
  { name: "Cable fly / pec deck", pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 1 },
  { name: "Pull-up", pattern: "compound", stability: "free", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Lat pulldown", pattern: "compound", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 2 },
  { name: "Barbell row", pattern: "compound", stability: "free", lengthBias: "mid", rom: "full", axial: true, muscles: 2 },
  { name: "Chest-supported row", pattern: "compound", stability: "supported", lengthBias: "mid", rom: "full", axial: false, muscles: 2 },
  { name: "Overhead press (standing)", pattern: "compound", stability: "free", lengthBias: "mid", rom: "full", axial: true, muscles: 2 },
  { name: "Cable lateral raise", pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 1 },
  { name: "Dumbbell lateral raise", pattern: "isolation", stability: "free", lengthBias: "shortened", rom: "full", axial: false, muscles: 1 },
  { name: "Overhead cable triceps extension", pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 1 },
  { name: "Triceps pushdown", pattern: "isolation", stability: "supported", lengthBias: "shortened", rom: "full", axial: false, muscles: 1 },
  { name: "Preacher / incline curl", pattern: "isolation", stability: "supported", lengthBias: "lengthened", rom: "full", axial: false, muscles: 1 },
  { name: "Standing barbell curl", pattern: "isolation", stability: "free", lengthBias: "mid", rom: "full", axial: false, muscles: 1 },
  { name: "Standing calf raise", pattern: "isolation", stability: "free", lengthBias: "lengthened", rom: "full", axial: true, muscles: 1 },
];

const ringColor = (r: number) =>
  r >= 80 ? "#10b981" : r >= 60 ? "#34d399" : r >= 40 ? "#f59e0b" : "#ef4444";

export default function ExerciseSfr() {
  const [presetName, setPresetName] = useState(PRESETS[0].name);
  const [spec, setSpec] = useState<ExerciseSpec>(() => {
    const { name: _name, ...rest } = PRESETS[0];
    return rest;
  });
  const [reps, setReps] = useState(10);
  const [rir, setRir] = useState(1);

  const patch = (p: Partial<ExerciseSpec>) => setSpec((s) => ({ ...s, ...p }));
  const loadPreset = (name: string) => {
    setPresetName(name);
    const p = PRESETS.find((x) => x.name === name);
    if (p) {
      const { name: _name, ...rest } = p;
      setSpec(rest);
    }
  };

  const setSpecOf = (s: ExerciseSpec) => ({
    reps,
    rir,
    pattern: s.pattern,
    stability: s.stability,
    lengthBias: s.lengthBias,
    rom: s.rom,
    axial: s.axial,
  });

  const r = exerciseRating(setSpecOf(spec), spec.muscles);

  const ranked = PRESETS.map((p) => ({
    name: p.name,
    muscles: p.muscles,
    ...exerciseRating(setSpecOf(p), p.muscles),
  })).sort((a, b) => b.sfr - a.sfr);

  const ring = ringColor(r.rating);
  const circ = 2 * Math.PI * 44;

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>Describe the exercise</CardTitle>
          <div className="space-y-4">
            <Field label="Start from a common lift">
              <Select
                value={presetName}
                onChange={loadPreset}
                options={PRESETS.map((p) => ({ value: p.name, label: p.name }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Movement">
                <SegmentedControl
                  value={spec.pattern}
                  onChange={(v) => patch({ pattern: v })}
                  options={[
                    { value: "compound", label: "Compound" },
                    { value: "isolation", label: "Isolation" },
                  ]}
                />
              </Field>
              <Field label="Support">
                <SegmentedControl
                  value={spec.stability}
                  onChange={(v) => patch({ stability: v })}
                  options={[
                    { value: "free", label: "Free" },
                    { value: "supported", label: "Machine" },
                  ]}
                />
              </Field>
            </div>

            <Field label="Where it loads the muscle hardest">
              <Select
                value={spec.lengthBias}
                onChange={(v) => patch({ lengthBias: v })}
                options={[
                  { value: "lengthened", label: "Stretched — hardest at the bottom" },
                  { value: "mid", label: "Mid-range" },
                  { value: "shortened", label: "Squeezed — hardest at the top" },
                ]}
              />
            </Field>

            <Field label="Range of motion">
              <Select
                value={spec.rom}
                onChange={(v) => patch({ rom: v })}
                options={[
                  { value: "full", label: "Full range" },
                  { value: "lengthenedPartial", label: "Lengthened partials (bottom half)" },
                  { value: "shortPartial", label: "Short partials (top half)" },
                ]}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Axial / systemic load" hint="bar on your back or in your hands">
                <SegmentedControl
                  value={spec.axial ? "yes" : "no"}
                  onChange={(v) => patch({ axial: v === "yes" })}
                  options={[
                    { value: "no", label: "No" },
                    { value: "yes", label: "Yes" },
                  ]}
                />
              </Field>
              <Field label="Muscles trained" hint="that it actually grows">
                <NumberInput
                  value={spec.muscles}
                  onChange={(v) => patch({ muscles: Math.round(v) })}
                  min={1}
                  max={5}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Reps you'd do">
                <NumberInput value={reps} onChange={setReps} min={1} max={50} />
              </Field>
              <Field label="Reps in reserve">
                <NumberInput value={rir} onChange={setRir} min={0} max={10} />
              </Field>
            </div>

            <Tip>
              A low rating is not a bad exercise — it is an <em>expensive</em> one.
              Heavy free-weight compounds are the best strength builders there are
              and train several muscles per set; they just cost too much fatigue to
              be your tenth set of the week.
            </Tip>
          </div>

          <InfoNote>
            <p>
              Stimulus per set is the set&apos;s stimulating reps (≈ 5 − RIR, or
              every rep on a heavy set) scaled for where the exercise loads the
              muscle: long muscle length ×1.15, short length ×0.85, short partials
              ×0.6.
            </p>
            <p>
              Fatigue per set multiplies proximity to failure (0 RIR ×1.3 vs 3 RIR
              ×0.85), compound vs isolation (×1.35 / ×1.0), free weight vs
              supported (×1.1 / ×0.9), long-length damage (×1.1), axial loading
              (×1.15) and very heavy (≤5RM, ×1.15) or very long (&gt;20 rep, ×1.2)
              sets.
            </p>
            <p>
              <strong>SFR</strong> is stimulus ÷ fatigue for the target muscle. The
              whole-body figure multiplies the stimulus by the number of muscles
              trained, because a compound&apos;s fatigue is shared between them —
              that is the honest case for big lifts on a time budget.
            </p>
          </InfoNote>
        </Card>

        <Card>
          <CardTitle>Rating</CardTitle>
          <div className="flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={ring}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - r.rating / 100)}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{Math.round(r.rating)}</span>
                <span className="text-xs text-zinc-400">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <Badge tone={r.rating >= 45 ? "accent" : "warn"}>{r.tier}</Badge>
              <p className="mt-2 text-sm text-zinc-500">
                <strong className="text-zinc-700 dark:text-zinc-200">
                  {r.suggestedSets}
                </strong>{" "}
                per session for the target muscle.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Stimulus / set" value={fmt(r.stimulus, 2)} />
            <Stat label="Fatigue / set" value={fmt(r.fatigue, 2)} />
            <Stat label="SFR" value={fmt(r.sfr, 2)} />
            <Stat label="SFR (all muscles)" value={fmt(r.sfrWhole, 2)} />
          </div>

          <div className="mt-4 rounded-xl bg-accent-50 px-4 py-3 dark:bg-accent-900/20">
            <div className="text-xs font-medium uppercase tracking-wide text-accent-700 dark:text-accent-400">
              Where it belongs in your session
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
              {r.placement}
            </p>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {r.notes.map((n, i) => (
              <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="text-accent-500">•</span>
                {n}
              </p>
            ))}
          </div>
        </Card>
      </CalcGrid>

      <Card>
        <CardTitle>Common lifts, ranked at {reps} reps @ {rir} RIR</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Exercise</th>
                <th className="px-4 py-2 font-medium">Stimulus</th>
                <th className="px-4 py-2 font-medium">Fatigue</th>
                <th className="px-4 py-2 font-medium">SFR</th>
                <th className="px-4 py-2 font-medium" title="Counting every muscle the lift trains">
                  Whole-body
                </th>
                <th className="px-4 py-2 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((x) => (
                <tr
                  key={x.name}
                  className={
                    "border-t border-zinc-100 dark:border-zinc-800 " +
                    (x.name === presetName ? "bg-accent-50 dark:bg-accent-900/20" : "")
                  }
                >
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => loadPreset(x.name)}
                      className="text-left font-medium hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      {x.name}
                    </button>
                    {x.muscles > 1 && (
                      <span className="ml-1 text-xs text-zinc-400">
                        · {x.muscles} muscles
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">{fmt(x.stimulus, 2)}</td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">{fmt(x.fatigue, 2)}</td>
                  <td className="px-4 py-2 tabular-nums">{fmt(x.sfr, 2)}</td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">{fmt(x.sfrWhole, 2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${x.rating}%`, backgroundColor: ringColor(x.rating) }}
                        />
                      </div>
                      <span className="w-6 text-right tabular-nums text-xs text-zinc-500">
                        {Math.round(x.rating)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Every lift scored as if you took it to {reps} reps with {rir} in reserve,
          so the ranking is purely about the movement. Tap a name to load it above.
          Build your weekly volume out of the top of this list and keep the bottom
          of it for the two or three lifts you actually want to get strong at — the
          whole-body column is why those still earn their place: a deadlift&apos;s
          fatigue is shared across everything it trains.
        </p>
      </Card>
    </div>
  );
}
