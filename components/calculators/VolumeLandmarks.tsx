"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  SegmentedControl,
  Result,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { TRAINING_LEVELS } from "@/lib/formulas";
import {
  MUSCLE_LANDMARKS,
  personalLandmarks,
  volumeVerdict,
  mesocycle,
  type EnergyBalance,
  type RecoveryQuality,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * Volume landmarks — MV / MEV / MAV / MRV per muscle, personalised for
 * experience, age, energy balance and recovery, plus the mesocycle that walks
 * you from the bottom of that range to the top and then deloads.
 */

const VERDICT_TONE: Record<string, "accent" | "warn"> = {
  under: "warn",
  maintenance: "warn",
  growing: "accent",
  optimal: "accent",
  over: "warn",
};

export default function VolumeLandmarks() {
  const { profile, patch } = useProfile();
  const [muscle, setMuscle] = useState("chest");
  const [energy, setEnergy] = useState<EnergyBalance>("maintenance");
  const [recovery, setRecovery] = useState<RecoveryQuality>("average");
  const [currentSets, setCurrentSets] = useState(12);
  const [frequency, setFrequency] = useState(2);
  const [weeks, setWeeks] = useState(5);

  const ctx = { experience: profile.experience, age: profile.age, energy, recovery };
  const l = personalLandmarks(muscle, ctx);
  const verdict = volumeVerdict(currentSets, l);
  const plan = mesocycle(l, weeks, frequency);

  // Position on the landmark ruler, scaled a little past MRV so an over-MRV
  // marker still lands on the bar.
  const scaleMax = Math.max(l.mrv * 1.25, currentSets * 1.05, 1);
  const pos = (v: number) => Math.min(100, (v / scaleMax) * 100);

  const perSession = currentSets / Math.max(1, frequency);
  // The hardest week of the block, for the "that's too many sets a session" check.
  const peakSets = Math.max(...plan.filter((w) => !w.deload).map((w) => w.weeklySets));
  const peakPerSession = peakSets / Math.max(1, frequency);

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>Muscle & context</CardTitle>
          <div className="space-y-4">
            <Field label="Muscle">
              <Select
                value={muscle}
                onChange={setMuscle}
                options={MUSCLE_LANDMARKS.map((m) => ({ value: m.key, label: m.label }))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Your weekly sets" hint="direct, hard sets">
                <NumberInput value={currentSets} onChange={setCurrentSets} min={0} max={60} />
              </Field>
              <Field label="Sessions per week">
                <NumberInput value={frequency} onChange={setFrequency} min={1} max={7} />
              </Field>
            </div>

            <Field label="Training experience">
              <Select
                value={profile.experience}
                onChange={(v) => patch({ experience: v })}
                options={TRAINING_LEVELS.map((t) => ({
                  value: t.key,
                  label: `${t.label} (${t.years})`,
                }))}
              />
            </Field>

            <Field label="Energy balance" hint="recovery follows calories">
              <SegmentedControl
                value={energy}
                onChange={setEnergy}
                options={[
                  { value: "deficit", label: "Cutting" },
                  { value: "maintenance", label: "Maintaining" },
                  { value: "surplus", label: "Bulking" },
                ]}
              />
            </Field>

            <Field label="Sleep & stress">
              <SegmentedControl
                value={recovery}
                onChange={setRecovery}
                options={[
                  { value: "good", label: "Good" },
                  { value: "average", label: "Average" },
                  { value: "poor", label: "Poor" },
                ]}
              />
            </Field>

            <Field label="Block length" hint="last week is the deload">
              <Select
                value={String(weeks)}
                onChange={(v) => setWeeks(Number(v))}
                options={[4, 5, 6, 7].map((w) => ({ value: String(w), label: `${w} weeks` }))}
              />
            </Field>

            <Tip>
              Volume landmarks are a <em>range to move through</em>, not a target
              to sit on. Start a block at MEV, add a set per session each week, and
              deload when you reach MRV — that way the same volume that stops
              working in week 5 is a fresh stimulus again in week 1.
            </Tip>
          </div>

          <InfoNote>
            <p>
              <strong>MV</strong> maintenance volume — holds the muscle you have.{" "}
              <strong>MEV</strong> minimum effective volume — the least that
              reliably grows it. <strong>MAV</strong> maximum adaptive volume — the
              productive working range. <strong>MRV</strong> maximum recoverable
              volume — past this, fatigue outruns the stimulus.
            </p>
            <p>
              Baselines are the per-muscle figures popularised by Mike Israetel /
              Renaissance Periodization, in weekly hard sets taken within a few
              reps of failure. Count a set for the muscle that actually limits it;
              a compound counts fully for its prime mover and about half for the
              assisting muscles.
            </p>
            <p>
              Your numbers are then shifted: beginners need and tolerate less
              (MEV −30%, MRV −25%), advanced lifters more (+15% / +10%); age 40+
              takes 10% off the ceiling and 55+ takes 20%; a calorie deficit −20%,
              a surplus +10%; poor sleep or high stress −15%, good recovery +5%.
            </p>
          </InfoNote>
        </Card>

        <Card>
          <CardTitle>Your landmarks — {l.label}</CardTitle>

          <Result
            label="Where your volume sits"
            value={`${currentSets} sets`}
            unit="/week"
            sub={verdict.advice}
          />

          {/* Landmark ruler */}
          <div className="mt-5">
            <div className="relative h-8 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              {/* Maintenance → MEV */}
              <div
                className="absolute inset-y-0 bg-zinc-300 dark:bg-zinc-700"
                style={{ left: `${pos(l.mv)}%`, width: `${pos(l.mev) - pos(l.mv)}%` }}
              />
              {/* MEV → MAV low */}
              <div
                className="absolute inset-y-0 bg-accent-300 dark:bg-accent-900"
                style={{ left: `${pos(l.mev)}%`, width: `${pos(l.mavLo) - pos(l.mev)}%` }}
              />
              {/* The adaptive range */}
              <div
                className="absolute inset-y-0 bg-accent-500"
                style={{ left: `${pos(l.mavLo)}%`, width: `${pos(l.mavHi) - pos(l.mavLo)}%` }}
              />
              {/* MAV high → MRV */}
              <div
                className="absolute inset-y-0 bg-amber-400"
                style={{ left: `${pos(l.mavHi)}%`, width: `${pos(l.mrv) - pos(l.mavHi)}%` }}
              />
              {/* Over MRV */}
              <div
                className="absolute inset-y-0 right-0 bg-red-400/70"
                style={{ left: `${pos(l.mrv)}%` }}
              />
              {/* You */}
              <div
                className="absolute inset-y-0 w-0.5 bg-zinc-900 dark:bg-white"
                style={{ left: `${pos(currentSets)}%` }}
              />
            </div>
            <div className="relative mt-1 h-4 text-[11px] text-zinc-500">
              {[
                { v: l.mev, label: "MEV" },
                { v: l.mrv, label: "MRV" },
              ].map((m) => (
                <span
                  key={m.label}
                  className="absolute -translate-x-1/2 tabular-nums"
                  style={{ left: `${pos(m.v)}%` }}
                >
                  {m.label} {m.v}
                </span>
              ))}
              <span
                className="absolute -translate-x-1/2 font-semibold tabular-nums text-zinc-900 dark:text-white"
                style={{ left: `${pos(currentSets)}%`, top: "0.9rem" }}
              >
                you · {currentSets}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              {[
                { c: "bg-zinc-300 dark:bg-zinc-700", t: "maintenance" },
                { c: "bg-accent-300 dark:bg-accent-900", t: "growing" },
                { c: "bg-accent-500", t: "adaptive range" },
                { c: "bg-amber-400", t: "near your ceiling" },
                { c: "bg-red-400/70", t: "over MRV" },
              ].map((k) => (
                <span key={k.t} className="flex items-center gap-1.5">
                  <span className={"h-2.5 w-2.5 rounded-sm " + k.c} />
                  {k.t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="MV" value={l.mv} unit="sets" />
            <Stat label="MEV" value={l.mev} unit="sets" />
            <Stat label="MAV" value={`${l.mavLo}–${l.mavHi}`} />
            <Stat label="MRV" value={l.mrv} unit="sets" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={VERDICT_TONE[verdict.key] ?? "accent"}>{verdict.label}</Badge>
            <Badge tone={frequency < l.freqLo || frequency > l.freqHi ? "warn" : "neutral"}>
              {frequency}× a week (suits {l.freqLo}–{l.freqHi}×)
            </Badge>
            <Badge tone={perSession > 6 ? "warn" : "neutral"}>
              {fmt(perSession, 1)} sets per session
            </Badge>
          </div>

          {perSession > 6 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Past about six hard sets for one muscle in a session, each extra set
              is worth a fraction of the first — add a day rather than more sets.
            </p>
          )}

          {l.adjustments.length === 0 && (
            <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800">
              These are the published baselines — an intermediate lifter under 40,
              eating at maintenance, recovering normally. Change your experience,
              energy balance or sleep on the left and the numbers move with you.
            </p>
          )}

          {l.adjustments.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Adjusted for you
              </p>
              {l.adjustments.map((a, i) => (
                <p key={i} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="text-accent-500">•</span>
                  {a}
                </p>
              ))}
            </div>
          )}
        </Card>
      </CalcGrid>

      <Card>
        <CardTitle>Your {weeks}-week block for {l.label.toLowerCase()}</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Week</th>
                <th className="px-4 py-2 font-medium">Weekly sets</th>
                <th className="px-4 py-2 font-medium">Per session</th>
                <th className="px-4 py-2 font-medium">Effort</th>
                <th className="px-4 py-2 font-medium">What you&apos;re doing</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((w) => (
                <tr
                  key={w.week}
                  className={
                    "border-t border-zinc-100 dark:border-zinc-800 " +
                    (w.deload ? "bg-amber-50/60 dark:bg-amber-900/10" : "")
                  }
                >
                  <td className="px-4 py-2 font-medium">{w.week}</td>
                  <td className="px-4 py-2 tabular-nums">{w.weeklySets}</td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {fmt(w.setsPerSession, 1)} × {frequency} days
                  </td>
                  <td className="px-4 py-2">
                    {w.rir} RIR
                    {w.rir === 0 && <span className="ml-1 text-xs text-zinc-400">(to failure)</span>}
                  </td>
                  <td className="px-4 py-2 text-zinc-500">{w.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {peakPerSession > 6 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Peak week works out at {fmt(peakPerSession, 1)} sets per session. Past
            about six hard sets for one muscle in a session the extra sets are
            worth a fraction of the first — run this block at{" "}
            {Math.ceil(peakSets / 6)}× a week instead so the volume actually lands.
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Volume rises from MEV to MRV while effort creeps toward failure, then a
          deload week clears the accumulated fatigue so the next block can start
          from a low, effective dose again. If progress stalls before the last
          week, that week <em>is</em> your MRV — deload early and start the next
          block there.
        </p>
      </Card>

      <Card>
        <CardTitle>Every muscle, adjusted for you</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Muscle</th>
                <th className="px-4 py-2 font-medium">MV</th>
                <th className="px-4 py-2 font-medium">MEV</th>
                <th className="px-4 py-2 font-medium">MAV</th>
                <th className="px-4 py-2 font-medium">MRV</th>
                <th className="px-4 py-2 font-medium">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {MUSCLE_LANDMARKS.map((m) => {
                const p = personalLandmarks(m.key, ctx);
                const active = m.key === muscle;
                return (
                  <tr
                    key={m.key}
                    className={
                      "border-t border-zinc-100 dark:border-zinc-800 " +
                      (active ? "bg-accent-50 dark:bg-accent-900/20" : "")
                    }
                  >
                    <td className="px-4 py-2 font-medium">{p.label}</td>
                    <td className="px-4 py-2 tabular-nums text-zinc-500">{p.mv}</td>
                    <td className="px-4 py-2 tabular-nums">{p.mev}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {p.mavLo}–{p.mavHi}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{p.mrv}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {p.freqLo}–{p.freqHi}×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Weekly hard sets. Small muscles that recover fast (side delts, abs,
          calves) tolerate more frequency and volume; big, damaging movements
          (quads, hamstrings, chest) sit lower.
        </p>
      </Card>
    </div>
  );
}
