"use client";

import { useState } from "react";
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
import {
  stimulatingReps,
  isHeavySet,
  scoreScheme,
  STIMULATING_REP_WINDOW,
  type SchemeResult,
} from "@/lib/hypertrophy";
import { pctOfOneRM } from "@/lib/formulas";
import { fmt } from "@/lib/units";

/**
 * Effective (stimulating) reps — the single idea the whole stimulus model rests
 * on, plus a side-by-side comparison of the ways you might arrange a session's
 * work: heavy triples, straight sets of ten, or a long set to failure.
 */

interface Scheme {
  id: string;
  sets: number;
  reps: number;
  rir: number;
  restSec: number;
}

const DEFAULT_SCHEMES: Scheme[] = [
  { id: "a", sets: 5, reps: 5, rir: 1, restSec: 180 },
  { id: "b", sets: 4, reps: 10, rir: 1, restSec: 120 },
  { id: "c", sets: 3, reps: 20, rir: 0, restSec: 90 },
];

const restLabel = (sec: number) => (sec >= 120 ? `${sec / 60} min` : `${sec} s`);
const label = (s: Scheme) =>
  `${s.sets}×${s.reps} @ ${s.rir} RIR, ${restLabel(s.restSec)} rest`;

export default function EffectiveReps() {
  const [reps, setReps] = useState(10);
  const [rir, setRir] = useState(1);
  const [schemes, setSchemes] = useState<Scheme[]>(DEFAULT_SCHEMES);

  const sr = stimulatingReps(reps, rir);
  const heavy = isHeavySet(reps, rir);
  const pct = pctOfOneRM(reps, Math.max(1, 10 - rir));
  const wasted = Math.max(0, reps - sr);

  const setScheme = (id: string, p: Partial<Scheme>) =>
    setSchemes((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const scored: SchemeResult[] = schemes.map((s) =>
    scoreScheme(label(s), { sets: s.sets, reps: s.reps, rir: s.rir, restSec: s.restSec, day: 0 })
  );
  const bestStimulus = Math.max(...scored.map((s) => s.stimulus));
  const bestPerMinute = Math.max(...scored.map((s) => s.stimulusPerMinute));
  const bestSfr = Math.max(...scored.map((s) => s.sfr));

  return (
    <div className="space-y-5">
      <CalcGrid>
        <Card>
          <CardTitle>One set</CardTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reps performed">
                <NumberInput value={reps} onChange={setReps} min={1} max={50} />
              </Field>
              <Field label="Reps in reserve" hint="0 = failure">
                <NumberInput value={rir} onChange={setRir} min={0} max={10} />
              </Field>
            </div>

            {/* The rep ladder: which reps in this set actually did anything. */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  The set, rep by rep
                </span>
                <span className="text-xs text-zinc-400">
                  {sr} stimulating · {wasted} warm-up
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(reps, 40) }, (_, i) => {
                  const repNo = i + 1;
                  const stimulating = repNo > reps - sr;
                  return (
                    <span
                      key={repNo}
                      title={`Rep ${repNo}${stimulating ? " — stimulating" : ""}`}
                      className={
                        "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold " +
                        (stimulating
                          ? "bg-accent-500 text-white"
                          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800")
                      }
                    >
                      {repNo}
                    </span>
                  );
                })}
                {reps > 40 && <span className="self-center text-xs text-zinc-400">…</span>}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {heavy
                  ? "Heavy load: motor-unit recruitment is maximal and the bar is slow from the first rep, so the whole set is stimulating."
                  : sr === 0
                  ? "Nothing here is stimulating — this set stops more than five reps short of failure."
                  : `The green reps are the ones performed with full recruitment and slow enough velocity to grow the muscle. Everything before them gets you there.`}
              </p>
            </div>

            <Tip>
              Two extra reps at the end of a set are worth more than two extra
              sets at the start of one. Going from 3 RIR to 1 RIR turns a set that
              banks 2 stimulating reps into one that banks 4 — double the stimulus
              for one extra minute in the gym.
            </Tip>
          </div>

          <InfoNote>
            <p>
              A rep only builds muscle if the fibres are both <em>recruited</em>{" "}
              and <em>shortening slowly</em> — that combination produces the high
              mechanical tension that signals growth. With a moderate load, early
              reps are fast and only recruit the smaller motor units, so they
              contribute little; it takes accumulated fatigue within the set to
              bring the high-threshold units in and slow the bar down.
            </p>
            <p>
              That gives the <strong>5 − RIR</strong> rule: about the last five
              reps before failure are stimulating. Heavy sets (≈85%+ 1RM, a
              rep-max of {STIMULATING_REP_WINDOW} or fewer) recruit everything from
              rep one, so every rep counts — which is why 5×3 and 3×10 can produce
              similar growth from very different work.
            </p>
            <p>
              %1RM is estimated from the RPE/RTS chart (reps + RIR → load), the
              same table the RPE converter uses.
            </p>
          </InfoNote>
        </Card>

        <Card>
          <CardTitle>What that set is worth</CardTitle>
          <Result
            label="Stimulating reps in this set"
            value={sr}
            unit={`of ${reps}`}
            sub={
              heavy
                ? "Heavy set — every rep is stimulating"
                : `You leave ${rir} in reserve, so you forfeit ${Math.min(rir, STIMULATING_REP_WINDOW)} of the ${STIMULATING_REP_WINDOW} available`
            }
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Load" value={fmt(pct, 0)} unit="% 1RM" />
            <Stat label="Rep-max at this load" value={reps + rir} unit="reps" />
            <Stat label="Non-stimulating reps" value={wasted} />
            <Stat
              label="Stimulus per rep done"
              value={fmt(reps > 0 ? sr / reps : 0, 2)}
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Same set, different effort
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">RIR</th>
                    <th className="px-3 py-2 font-medium">Stimulating reps</th>
                    <th className="px-3 py-2 font-medium">vs your set</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((r) => {
                    const v = stimulatingReps(reps, r);
                    const delta = v - sr;
                    return (
                      <tr
                        key={r}
                        className={
                          "border-t border-zinc-100 dark:border-zinc-800 " +
                          (r === rir ? "bg-accent-50 dark:bg-accent-900/20" : "")
                        }
                      >
                        <td className="px-3 py-2 font-medium">
                          {r}
                          {r === 0 && <span className="ml-1 text-xs text-zinc-400">failure</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{v}</td>
                        <td
                          className={
                            "px-3 py-2 tabular-nums " +
                            (delta > 0
                              ? "text-accent-600 dark:text-accent-400"
                              : delta < 0
                              ? "text-red-500"
                              : "text-zinc-400")
                          }
                        >
                          {r === rir ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </CalcGrid>

      <Card>
        <CardTitle>Compare three ways to train it</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {schemes.map((s, i) => (
            <div
              key={s.id}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Scheme {String.fromCharCode(65 + i)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Sets">
                  <NumberInput value={s.sets} onChange={(v) => setScheme(s.id, { sets: v })} min={1} max={20} />
                </Field>
                <Field label="Reps">
                  <NumberInput value={s.reps} onChange={(v) => setScheme(s.id, { reps: v })} min={1} max={50} />
                </Field>
                <Field label="RIR">
                  <NumberInput value={s.rir} onChange={(v) => setScheme(s.id, { rir: v })} min={0} max={10} />
                </Field>
              </div>
              <div className="mt-2">
                <Field label="Rest">
                  <Select
                    value={String(s.restSec)}
                    onChange={(v) => setScheme(s.id, { restSec: Number(v) })}
                    options={[
                      { value: "60", label: "60 s" },
                      { value: "90", label: "90 s" },
                      { value: "120", label: "2 min" },
                      { value: "180", label: "3 min" },
                      { value: "240", label: "4 min" },
                    ]}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-3 py-2 font-medium">Scheme</th>
                <th className="px-3 py-2 font-medium">Stim. reps</th>
                <th className="px-3 py-2 font-medium">Stimulus</th>
                <th className="px-3 py-2 font-medium">Fatigue</th>
                <th className="px-3 py-2 font-medium">SFR</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Stimulus / min</th>
              </tr>
            </thead>
            <tbody>
              {scored.map((s, i) => (
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <span className="font-medium">{String.fromCharCode(65 + i)}</span>{" "}
                    <span className="text-zinc-500">{s.label}</span>
                    {s.heavy && (
                      <span className="ml-1 align-middle">
                        <Badge tone="neutral">heavy</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">
                    {s.totalStimulatingReps}
                  </td>
                  <td
                    className={
                      "px-3 py-2 tabular-nums " +
                      (s.stimulus === bestStimulus ? "font-semibold text-accent-600 dark:text-accent-400" : "")
                    }
                  >
                    {fmt(s.stimulus, 1)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">{fmt(s.fatigue, 1)}</td>
                  <td
                    className={
                      "px-3 py-2 tabular-nums " +
                      (s.sfr === bestSfr ? "font-semibold text-accent-600 dark:text-accent-400" : "")
                    }
                  >
                    {fmt(s.sfr, 2)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-zinc-500">{fmt(s.minutes, 0)} min</td>
                  <td
                    className={
                      "px-3 py-2 tabular-nums " +
                      (s.stimulusPerMinute === bestPerMinute
                        ? "font-semibold text-accent-600 dark:text-accent-400"
                        : "")
                    }
                  >
                    {fmt(s.stimulusPerMinute, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Stimulus is the sum of each set&apos;s stimulating reps after the
          within-session fatigue discount; fatigue is the systemic cost; SFR is the
          ratio you want to maximise. Time assumes ~3 s per rep plus your rest.
          Heavy schemes buy stimulus with joint and nervous-system cost; very long
          sets buy it with discomfort and time; the moderate-rep middle is usually
          the best trade — which is exactly why most hypertrophy work lives there.
        </p>
      </Card>
    </div>
  );
}
