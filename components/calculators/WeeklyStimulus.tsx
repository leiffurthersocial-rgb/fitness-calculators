"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  Result,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  weeklyNetStimulus,
  frequencyCurve,
  findDataset,
  DATASETS,
  DEFAULT_SETTINGS,
  type WnsInput,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * Weekly net stimulus — Chris Beardsley's model:
 *   WNS = (stimulus per workout × frequency) − (atrophy days × daily atrophy)
 * Five inputs, one number.
 */

const DEFAULTS: WnsInput = {
  ...DEFAULT_SETTINGS,
  frequency: 3,
  setsPerWorkout: 6,
};

const bandTone = (key: string) =>
  key === "growing" || key === "productive" ? "accent" : key === "peak" ? "neutral" : "warn";

export default function WeeklyStimulus() {
  const [saved, setSaved] = useLocalStorage<WnsInput>("vital.wns", DEFAULTS);
  const input = { ...DEFAULTS, ...saved };
  const patch = (p: Partial<WnsInput>) => setSaved({ ...input, ...p });

  const r = weeklyNetStimulus(input);
  const dataset = findDataset(input.dataset);
  const curve = frequencyCurve(input, input.setsPerWorkout, 7);
  const here = curve.find((c) => c.frequency === Math.round(input.frequency));

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your training</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency" hint="workouts / week">
              <NumberInput
                value={input.frequency}
                onChange={(v) => patch({ frequency: v })}
                min={0}
                max={7}
                suffix="×"
              />
            </Field>
            <Field label="Sets per workout" hint="to failure">
              <NumberInput
                value={input.setsPerWorkout}
                onChange={(v) => patch({ setsPerWorkout: v })}
                min={0}
                max={30}
              />
            </Field>
          </div>

          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Model settings
            </p>
            <div className="space-y-4">
              <Field label="Dataset" hint="the dose–response curve">
                <Select
                  value={input.dataset}
                  onChange={(v) => patch({ dataset: v })}
                  options={DATASETS.map((d) => ({
                    value: d.key,
                    label: d.recommended ? `${d.label} (recommended)` : d.label,
                  }))}
                />
              </Field>
              <p className="-mt-2 text-xs leading-relaxed text-zinc-500">{dataset.note}</p>

              <Field label="Maintenance volume" hint="sets once a week that maintain — default 3">
                <NumberInput
                  value={input.maintenanceSets}
                  onChange={(v) => patch({ maintenanceSets: v })}
                  min={1}
                  max={5}
                  suffix="sets"
                />
              </Field>
              <Field label="Stimulus duration" hint="research says 36–48 h">
                <Select
                  value={String(input.stimulusHours)}
                  onChange={(v) => patch({ stimulusHours: Number(v) })}
                  options={[
                    { value: "24", label: "24 hours" },
                    { value: "36", label: "36 hours" },
                    { value: "48", label: "48 hours (standard)" },
                    { value: "72", label: "72 hours" },
                  ]}
                />
              </Field>
            </div>
          </div>

          <Tip>
            One workout of {fmt(input.maintenanceSets, 0)} sets a week is
            maintenance by definition — it scores exactly zero. Everything the
            model says follows from that: the stimulus those sets provide is what
            you lose over the {fmt(7 - input.stimulusHours / 24, 1)} days that
            workout leaves uncovered.
          </Tip>
        </div>

        <InfoNote>
          <p>
            <strong>
              WNS = (stimulus per workout × frequency) − (atrophy days × daily
              atrophy rate)
            </strong>
            .
          </p>
          <p>
            <strong>Stimulus per workout</strong> is sets<sup>k</sup>, with k
            fixed by the dataset: Schoenfeld&apos;s meta-analysis has 6 sets
            producing 2× the stimulus of a single set, Pelland&apos;s has 6 sets
            producing 4×. One set to failure = 1 arbitrary unit in both.
          </p>
          <p>
            <strong>Atrophy days</strong> are the days no workout&apos;s stimulus
            covers: 7 − frequency × {fmt(input.stimulusHours / 24, 1)} days, never
            below zero. The growth stimulus lasts roughly 36–48 hours.
          </p>
          <p>
            <strong>The daily atrophy rate</strong> comes from maintenance volume.
            A single weekly workout of {fmt(input.maintenanceSets, 0)} sets holds
            muscle, so the stimulus it produces must be exactly what is lost over
            the {fmt(7 - input.stimulusHours / 24, 1)} uncovered days:{" "}
            {fmt(r.dailyAtrophy, 2)} units a day.
          </p>
          <p>
            Because the per-workout curve flattens fast while atrophy is charged
            by the day, spreading the same sets over more workouts scores higher —
            that is the point the model exists to make. It prices stimulus only,
            not fatigue, joints or time.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Weekly net stimulus</CardTitle>

        <Result
          label="Weekly net stimulus"
          value={fmt(r.wns, 2)}
          unit="units"
          sub={r.band.blurb}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={bandTone(r.band.key)}>{r.band.label}</Badge>
          <span className="text-xs text-zinc-500">
            {fmt(r.maintenanceWorkoutsWorth, 1)}× a maintenance workout · MEV{" "}
            {fmt(r.landmarks.mev, 1)} · MAV {fmt(r.landmarks.mavLo, 1)}–
            {fmt(r.landmarks.mavHi, 1)} · MRV {fmt(r.landmarks.mrv, 1)}
          </span>
        </div>

        {/* The two halves of the equation. */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Stimulus / workout" value={fmt(r.perWorkout, 2)} />
          <Stat label="× frequency" value={fmt(r.weeklyStimulus, 2)} />
          <Stat label="Atrophy days" value={fmt(r.atrophyDays, 1)} unit={`× ${fmt(r.dailyAtrophy, 2)}/day`} />
          <Stat label="− weekly atrophy" value={fmt(r.weeklyAtrophy, 2)} />
        </div>

        <div className="mt-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 5, right: 12, bottom: 5, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f4633" />
              <XAxis
                dataKey="frequency"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                label={{ value: "workouts per week", position: "insideBottom", offset: -4, fontSize: 10, fill: "#a1a1aa" }}
                height={34}
              />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} width={40} />
              <Tooltip
                formatter={(v) => [`${fmt(Number(v), 2)} units`, "WNS"]}
                labelFormatter={(f) => `${f}× a week × ${fmt(input.setsPerWorkout, 0)} sets`}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="wns"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#10b981" }}
                isAnimationActive={false}
              />
              {here && <ReferenceDot x={here.frequency} y={here.wns} r={5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Weekly net stimulus against frequency, holding{" "}
          {fmt(input.setsPerWorkout, 0)} sets per workout. The line steepens up to
          the point where the week is fully covered ({fmt(7 / (input.stimulusHours / 24), 1)}×
          at {fmt(input.stimulusHours, 0)} h) because each workout both adds
          stimulus and removes atrophy days — the dot is you.
        </p>

        {r.notes.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {r.notes.map((n, i) => (
              <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="text-accent-500">•</span>
                {n}
              </p>
            ))}
          </div>
        )}
      </Card>
    </CalcGrid>
  );
}
