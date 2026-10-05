"use client";

import { useState } from "react";
import { Card, CardTitle, Field, NumberInput, Result, Stat, InfoNote, CalcGrid, Select, Tip } from "../ui";
import { STIMULATING_REPS_AT_FAILURE, stimulatingReps } from "@/lib/wns";

export default function StimulatingReps() {
  const [reps, setReps] = useState(10);
  const [rir, setRir] = useState(1);
  const [sets, setSets] = useState(3);

  const perSet = stimulatingReps(reps, rir);
  const total = perSet * sets;
  const junk = Math.max(0, reps - perSet);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your sets</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reps per set">
              <NumberInput value={reps} onChange={setReps} min={1} max={50} suffix="reps" />
            </Field>
            <Field label="Sets">
              <NumberInput value={sets} onChange={setSets} min={1} max={20} suffix="sets" />
            </Field>
          </div>
          <Field label="Reps left in the tank" hint="RIR">
            <Select
              value={String(rir)}
              onChange={(v) => setRir(Number(v))}
              options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({
                value: String(n),
                label: n === 0 ? "0: to failure" : `${n} rep${n > 1 ? "s" : ""} in reserve`,
              }))}
            />
          </Field>
          <Result
            label="Stimulating reps"
            value={total}
            unit="total"
            sub={`${perSet} per set × ${sets} sets`}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Effective sets" value={((perSet / STIMULATING_REPS_AT_FAILURE) * sets).toFixed(1)} />
            <Stat label="Lead-in reps per set" value={junk} />
          </div>
          {rir >= 4 && <Tip>At {rir} RIR few reps are stimulating. Take sets within 0–3 reps of failure.</Tip>}
        </div>
        <InfoNote>
          <p>
            Chris Beardsley&apos;s stimulating-reps model: muscle growth comes from reps where all
            motor units are recruited and the fibers contract slowly under high tension. In a set
            taken to failure that is roughly the last 5 reps, whatever the load from about 5 to 30+
            reps.
          </p>
          <p>Stimulating reps per set = min(reps, 5 − RIR). The earlier reps are the lead-in.</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>By proximity to failure</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line-strong)] text-left text-xs text-zinc-600 dark:text-zinc-400">
              <th className="py-2 font-medium">Stop at</th>
              <th className="py-2 text-right font-medium">Stim. reps / set</th>
              <th className="py-2 text-right font-medium">Counts as</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((n) => {
              const s = stimulatingReps(reps, n);
              return (
                <tr
                  key={n}
                  className={"border-b border-[var(--line)] " + (n === rir ? "font-semibold text-accent-600 dark:text-accent-400" : "")}
                >
                  <td className="py-2">{n === 0 ? "Failure" : `${n} RIR`}</td>
                  <td className="py-2 text-right tabular-nums">{s}</td>
                  <td className="py-2 text-right tabular-nums">{(s / STIMULATING_REPS_AT_FAILURE).toFixed(1)} set</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          A set of {reps} stopped 3 reps short has the same lead-in fatigue as a set to failure but
          only {stimulatingReps(reps, 3)} stimulating reps. This is why the Routine planner and
          Weekly Net Stimulus count sets short of failure as partial sets.
        </p>
      </Card>
    </CalcGrid>
  );
}
