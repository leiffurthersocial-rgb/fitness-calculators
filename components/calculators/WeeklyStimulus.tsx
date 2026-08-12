"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  wnsCurve,
  findDataset,
  DATASETS,
  DEFAULT_SETTINGS,
  type WnsInput,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * Weekly net stimulus — Chris Beardsley's model, kept to the five inputs it
 * actually needs: how often you train the muscle, how many sets you do, which
 * dose–response dataset to believe, how much of a workout only maintains, and
 * how long a workout's stimulus lasts.
 */

const DEFAULTS: WnsInput = {
  ...DEFAULT_SETTINGS,
  frequency: 3,
  setsPerWorkout: 6,
};

const bandTone = (key: string) =>
  key === "productive" || key === "growing" ? "accent" : key === "peak" ? "neutral" : "warn";

export default function WeeklyStimulus() {
  const [saved, setSaved] = useLocalStorage<WnsInput>("vital.wns", DEFAULTS);
  const input = { ...DEFAULTS, ...saved };
  const patch = (p: Partial<WnsInput>) => setSaved({ ...input, ...p });

  const r = weeklyNetStimulus(input);
  const dataset = findDataset(input.dataset);
  const curve = wnsCurve(input, input.frequency, 15);
  const here = curve.find((c) => c.sets === Math.round(input.setsPerWorkout));

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
                max={14}
                suffix="×"
              />
            </Field>
            <Field label="Sets per workout">
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

              <Field label="Maintenance volume" hint="sets a workout spends holding — default 3">
                <NumberInput
                  value={input.maintenanceSets}
                  onChange={(v) => patch({ maintenanceSets: v })}
                  min={0}
                  max={15}
                  suffix="sets"
                />
              </Field>
              <Field label="Stimulus duration" hint="how long a workout's dose lasts — standard 48 h">
                <NumberInput
                  value={input.stimulusHours}
                  onChange={(v) => patch({ stimulusHours: v })}
                  min={6}
                  max={168}
                  suffix="h"
                />
              </Field>
            </div>
          </div>

          <Tip>
            Every workout spends its first {fmt(input.maintenanceSets, 0)} sets
            just holding the muscle you have. That is why adding a session is not
            free — it buys you another maintenance bill as well as another dose.
          </Tip>
        </div>

        <InfoNote>
          <p>
            <strong>WNS = effective frequency × (S(sets) − S(maintenance))</strong>
            , where S is the dataset&apos;s dose–response curve for a single
            workout: S(n) = a · ln(1 + n / b), normalised so one set = 1 stimulus
            unit in every dataset. Only the curve&apos;s shape changes when you
            switch dataset.
          </p>
          <p>
            <strong>Maintenance volume</strong> is the part of each workout that
            only holds what you have, so it is subtracted from every workout, not
            once a week.
          </p>
          <p>
            <strong>Stimulus duration</strong> caps the useful frequency at 168 ÷
            duration — {fmt(r.maxFrequency, 1)}× a week at{" "}
            {fmt(input.stimulusHours, 0)} h. Sessions past that land on a signal
            that is already switched on.
          </p>
          <p>
            The curves are fits anchored to the findings named on each dataset and
            applied per workout, which is the unit this model works in. WNS is a
            relative score for comparing plans, not a biological measurement, and
            it prices stimulus only — not fatigue, joints or time.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Weekly net stimulus</CardTitle>

        <Result
          label="Weekly net stimulus"
          value={fmt(r.wns, 1)}
          unit="units"
          sub={r.band.blurb}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={bandTone(r.band.key)}>{r.band.label}</Badge>
          <span className="text-xs text-zinc-500">
            MEV {fmt(r.landmarks.mev, 1)} · MAV {fmt(r.landmarks.mavLo, 1)}–
            {fmt(r.landmarks.mavHi, 1)} · MRV {fmt(r.landmarks.mrv, 1)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Per workout" value={fmt(r.gross, 2)} unit="gross" />
          <Stat label="Maintenance" value={`−${fmt(r.maintenance, 2)}`} />
          <Stat label="Net / workout" value={fmt(r.net, 2)} />
          <Stat
            label="Frequency used"
            value={fmt(r.effectiveFrequency, 1)}
            unit={r.capped ? `of ${fmt(r.frequency, 0)}` : "×"}
          />
        </div>

        <div className="mt-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 5, right: 12, bottom: 5, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f4633" />
              <XAxis
                dataKey="sets"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                label={{ value: "sets per workout", position: "insideBottom", offset: -4, fontSize: 10, fill: "#a1a1aa" }}
                height={34}
              />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} width={40} />
              <Tooltip
                formatter={(v) => [`${fmt(Number(v), 1)} units`, "WNS"]}
                labelFormatter={(s) => `${s} sets per workout`}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  background: "#18181b",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="wns"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {here && <ReferenceDot x={here.sets} y={here.wns} r={5} fill="#10b981" stroke="none" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Weekly net stimulus against sets per workout at {fmt(r.effectiveFrequency, 1)}
          × a week. The curve crosses zero at your maintenance volume and flattens
          as diminishing returns take over — the dot is you.
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
