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
  maxUsefulFrequency,
  DATASETS,
  DEFAULT_SETTINGS,
  LANDMARK_REFERENCE,
  REFERENCE_FREQUENCY,
  type WnsSettings,
} from "@/lib/hypertrophy";
import { fmt } from "@/lib/units";

/**
 * WNS landmarks — what a weekly-net-stimulus number actually means, and every
 * frequency × sets combination that gets you to one. The same model settings as
 * the calculator, because the WNS scale moves with them.
 */

const FREQUENCIES = [1, 2, 3, 4, 5, 6];
const SETS_ROWS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

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
  const cap = maxUsefulFrequency(settings.stimulusHours);
  const matrix = wnsMatrix(settings, FREQUENCIES, SETS_ROWS);
  const routes = waysToHit(target, settings, FREQUENCIES);
  const targetBand = wnsBand(target, l);

  const bands = [
    { key: "maintenance", label: "Maintenance", range: `0 – ${fmt(l.mev * 0.25, 1)}`, blurb: "Holds the muscle you have. Nothing more." },
    { key: "minimal", label: "Minimal growth", range: `${fmt(l.mev * 0.25, 1)} – ${fmt(l.mev, 1)}`, blurb: "Above maintenance, under the minimum effective dose." },
    { key: "growing", label: "Growing", range: `${fmt(l.mev, 1)} – ${fmt(l.mavLo, 1)}`, blurb: "Past MEV. Real, if unhurried, growth." },
    { key: "productive", label: "Productive range", range: `${fmt(l.mavLo, 1)} – ${fmt(l.mavHi, 1)}`, blurb: "The adaptive range — where most of a training block should live." },
    { key: "peak", label: "Near your ceiling", range: `${fmt(l.mavHi, 1)} – ${fmt(l.mrv, 1)}`, blurb: "Sustainable for the last weeks of a block, not indefinitely." },
    { key: "over", label: "Beyond recoverable", range: `> ${fmt(l.mrv, 1)}`, blurb: "Scores well on paper; fatigue eats it in practice." },
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

            <Field label="Maintenance volume" hint="sets a workout spends holding — default 3">
              <NumberInput
                value={settings.maintenanceSets}
                onChange={(v) => patch({ maintenanceSets: v })}
                min={0}
                max={15}
                suffix="sets"
              />
            </Field>
            <Field label="Stimulus duration" hint="how long a workout's dose lasts — standard 48 h">
              <NumberInput
                value={settings.stimulusHours}
                onChange={(v) => patch({ stimulusHours: v })}
                min={6}
                max={168}
                suffix="h"
              />
            </Field>

            <Field label="Target WNS" hint="what you're aiming for">
              <NumberInput value={target} onChange={setTarget} min={0} max={40} />
            </Field>

            <Tip>
              WNS is an arbitrary scale, and it moves when you change dataset or
              maintenance volume — so the landmarks are recomputed from your own
              settings rather than fixed. Compare plans within one set of
              settings, never across two.
            </Tip>
          </div>

          <InfoNote>
            <p>
              The landmarks are anchored to weekly set counts from the volume
              literature and priced with your settings: about{" "}
              {LANDMARK_REFERENCE.mev} sets a week to start growing (MEV),{" "}
              {LANDMARK_REFERENCE.mavLo}–{LANDMARK_REFERENCE.mavHi} for the
              productive range (MAV) and around {LANDMARK_REFERENCE.mrv} as the
              point most people stop recovering (MRV) — each split over a
              reference frequency of {REFERENCE_FREQUENCY}× a week.
            </p>
            <p>
              That is why raising the maintenance volume lowers every landmark:
              more of each workout goes on rent, so the same weekly sets buy less
              net stimulus.
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
                <span className={"shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold " + CELL_COLOR[b.key]}>
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
                    {row.frequency > cap + 1e-9 && (
                      <span className="ml-1 text-xs text-amber-500">
                        counts as {fmt(cap, 1)}×
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.setsPerWorkout ?? <span className="text-zinc-400">out of reach</span>}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {row.weeklySets ?? "—"}
                  </td>
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
          frequency. Fewer, bigger workouts pay the maintenance charge less often;
          more frequent ones each pay it again, which is why the weekly set count
          climbs as you spread the same stimulus out.
        </p>
      </Card>

      <Card>
        <CardTitle>Every combination</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
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
                    {f}×{f > cap + 1e-9 && <span className="text-amber-500">*</span>}
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
          landmark. {cap < 6 && <>An asterisk marks a frequency past the {fmt(cap, 1)}× the stimulus duration supports — those columns stop improving. </>}
          Rows below your maintenance volume of {fmt(settings.maintenanceSets, 0)}{" "}
          sets never leave maintenance, however often you train.
        </p>
      </Card>
    </div>
  );
}
