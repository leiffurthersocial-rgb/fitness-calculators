"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Select,
  Stat,
  Badge,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import {
  wnsLandmarks,
  wnsBand,
  wnsMatrix,
  waysToHit,
  findDataset,
  dailyAtrophyRate,
  atrophyDays,
  DATASETS,
  DEFAULT_SETTINGS,
  LANDMARK_MULTIPLES,
  type WnsSettings,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * WNS landmarks — what a weekly net stimulus number means, and every
 * frequency × sets combination that reaches one. Same model settings as the
 * calculator, because the WNS scale moves with them.
 */

const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7];
const SETS_ROWS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

const CELL_COLOR: Record<string, string> = {
  losing: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  maintenance: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  minimal: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  growing: "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300",
  productive: "bg-accent-500 text-white",
  peak: "bg-amber-400 text-amber-950",
  over: "bg-red-400 text-red-950",
};

export default function WnsLandmarks() {
  const [settings, setSettings] = useState<WnsSettings>(DEFAULT_SETTINGS);
  const [target, setTarget] = useState(4);
  const patch = (p: Partial<WnsSettings>) => setSettings((s) => ({ ...s, ...p }));

  const l = wnsLandmarks(settings);
  const dataset = findDataset(settings.dataset);
  const daily = dailyAtrophyRate(settings);
  const coverAll = 7 / (settings.stimulusHours / 24); // frequency that leaves no atrophy days
  const matrix = wnsMatrix(settings, FREQUENCIES, SETS_ROWS);
  const routes = waysToHit(target, settings, FREQUENCIES);
  const targetBand = wnsBand(target, l);

  const bands = [
    { key: "losing", label: "Losing muscle", range: "< 0", blurb: "Atrophy between sessions outweighs what the workouts build." },
    { key: "maintenance", label: "Maintenance", range: "0", blurb: "Stimulus and atrophy cancel out exactly." },
    { key: "minimal", label: "Minimal growth", range: `0 – ${fmt(l.mev, 1)}`, blurb: "Positive, but under the minimum effective dose." },
    { key: "growing", label: "Growing", range: `${fmt(l.mev, 1)} – ${fmt(l.mavLo, 1)}`, blurb: "Real growth, with room to add a workout." },
    { key: "productive", label: "Productive range", range: `${fmt(l.mavLo, 1)} – ${fmt(l.mavHi, 1)}`, blurb: "What most people can turn into muscle week after week." },
    { key: "peak", label: "Near your ceiling", range: `${fmt(l.mavHi, 1)} – ${fmt(l.mrv, 1)}`, blurb: "Good for the last weeks of a block, not indefinitely." },
    { key: "over", label: "Beyond recoverable", range: `> ${fmt(l.mrv, 1)}`, blurb: "The model prices stimulus, not fatigue. This is where progress stalls." },
  ];

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>Model settings</CardTitle>
          <div className="space-y-4">
            <Field label="Dataset" hint="the dose–response curve">
              <Select
                value={settings.dataset}
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
                value={settings.maintenanceSets}
                onChange={(v) => patch({ maintenanceSets: v })}
                min={1}
                max={5}
                suffix="sets"
              />
            </Field>
            <Field label="Stimulus duration" hint="research says 36–48 h">
              <Select
                value={String(settings.stimulusHours)}
                onChange={(v) => patch({ stimulusHours: Number(v) })}
                options={[
                  { value: "24", label: "24 hours" },
                  { value: "36", label: "36 hours" },
                  { value: "48", label: "48 hours (standard)" },
                  { value: "72", label: "72 hours" },
                ]}
              />
            </Field>

            <Field label="Target WNS" hint="what you're aiming for">
              <NumberInput value={target} onChange={setTarget} min={0} max={40} />
            </Field>

            <Tip>
              These settings fix the whole scale: one maintenance workout is worth{" "}
              {fmt(l.unit, 2)} units, and each atrophy day costs{" "}
              {fmt(daily, 2)}. Compare programmes within one set of settings,
              never across two.
            </Tip>
          </div>

          <InfoNote>
            <p>
              The zero point is Beardsley&apos;s: a single weekly workout at your
              maintenance volume scores exactly nothing. Above it, the landmarks
              here are multiples of that maintenance workout&apos;s stimulus —{" "}
              {LANDMARK_MULTIPLES.mev}× for MEV, {LANDMARK_MULTIPLES.mavLo}–
              {LANDMARK_MULTIPLES.mavHi}× for the productive range and{" "}
              {LANDMARK_MULTIPLES.mrv}× for MRV.
            </p>
            <p>
              Those multiples are this app&apos;s reading, not part of the model,
              which fixes only the zero. They scale with your settings so a band
              means the same thing whichever dataset you pick.
            </p>
          </InfoNote>
        </Card>

        <Card>
          <CardTitle>Your landmarks</CardTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="MV" value="0" />
            <Stat label="MEV" value={fmt(l.mev, 1)} />
            <Stat label="MAV" value={`${fmt(l.mavLo, 1)}–${fmt(l.mavHi, 1)}`} />
            <Stat label="MRV" value={fmt(l.mrv, 1)} />
          </div>

          <div className="mt-4 space-y-1.5">
            {bands.map((b) => (
              <div
                key={b.key}
                className="flex items-baseline gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span
                  className={
                    "w-24 shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-semibold tabular-nums " +
                    CELL_COLOR[b.key]
                  }
                >
                  {b.range}
                </span>
                <span className="min-w-0">
                  <span className="text-sm font-medium">{b.label}</span>{" "}
                  <span className="text-xs text-zinc-500">{b.blurb}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-accent-50 px-4 py-3 dark:bg-accent-900/20">
            <div className="text-xs font-medium uppercase tracking-wide text-accent-700 dark:text-accent-400">
              A target of {fmt(target, 1)} units
            </div>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
              <Badge tone={targetBand.key === "over" || targetBand.key === "losing" ? "warn" : "accent"}>
                {targetBand.label}
              </Badge>{" "}
              <span className="text-zinc-500">{targetBand.blurb}</span>
            </p>
          </div>
        </Card>
      </CalcGrid>

      <Card>
        <CardTitle>Ways to hit {fmt(target, 1)} units</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Frequency</th>
                <th className="px-4 py-2 font-medium">Sets per workout</th>
                <th className="px-4 py-2 font-medium">Weekly sets</th>
                <th className="px-4 py-2 font-medium">WNS</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((row) => (
                <tr key={row.frequency} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium">
                    {row.frequency}×
                    {row.frequency >= coverAll && (
                      <span className="ml-1 text-xs text-zinc-400">no atrophy days</span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.setsPerWorkout ?? (
                      <span className="text-zinc-400">out of reach</span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">{row.weeklySets ?? "—"}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.setsPerWorkout ? fmt(row.wns, 1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          The fewest whole sets per workout that reach the target at each
          frequency. Training more often needs dramatically fewer sets — and at
          low frequencies a target can be out of reach at any set count, because
          the per-workout curve flattens faster than{" "}
          {fmt(atrophyDays(1, settings.stimulusHours), 1)} days of atrophy can be
          paid off.
        </p>
      </Card>

      <Card>
        <CardTitle>Every combination</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Sets ↓ / freq →
                </th>
                {FREQUENCIES.map((f) => (
                  <th
                    key={f}
                    className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    {f}×
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={SETS_ROWS[i]}>
                  <td className="px-3 py-1 text-xs font-medium text-zinc-500">
                    {SETS_ROWS[i]} {SETS_ROWS[i] === 1 ? "set" : "sets"}
                  </td>
                  {row.map((cell) => (
                    <td key={cell.frequency} className="px-1 py-1">
                      <div
                        title={`${cell.frequency}× ${cell.setsPerWorkout} sets = ${cell.weeklySets} weekly sets · ${cell.band.label}`}
                        className={
                          "rounded-lg px-2 py-1.5 text-center text-xs font-semibold tabular-nums " +
                          CELL_COLOR[cell.band.key]
                        }
                      >
                        {fmt(cell.wns, 1)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Weekly net stimulus for every frequency × sets combination, coloured by
          landmark. Read across a row rather than down a column: at{" "}
          {fmt(settings.stimulusHours, 0)} h, going from 1× to {Math.ceil(coverAll)}× a
          week removes every atrophy day, which moves the number far more than
          piling sets into the workouts you already do.
        </p>
      </Card>
    </div>
  );
}
