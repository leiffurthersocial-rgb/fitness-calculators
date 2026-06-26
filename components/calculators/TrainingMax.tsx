"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { roundToIncrement } from "@/lib/formulas";
import { weightUnit, loadingIncrement, fmt } from "@/lib/units";

export default function TrainingMax() {
  const { profile } = useProfile();
  const unit = weightUnit(profile.units);
  const inc = loadingIncrement(profile.units);
  const [oneRM, setOneRM] = useState(120);
  const [tmPct, setTmPct] = useState(90);

  const tm = oneRM * (tmPct / 100);
  // Working sets from 50% to 100% of the training max in 5% steps.
  const rows = [];
  for (let pct = 50; pct <= 100; pct += 5) {
    const raw = tm * (pct / 100);
    rows.push({ pct, weight: roundToIncrement(raw, inc) });
  }

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Training max</CardTitle>
        <div className="space-y-4">
          <Field label={`1RM (${unit})`} hint="pull from Rep-max calc if you like">
            <NumberInput value={oneRM} onChange={setOneRM} step={2.5} suffix={unit} />
          </Field>
          <Field label="Training max %">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={100}
                step={1}
                value={tmPct}
                onChange={(e) => setTmPct(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm font-medium tabular-nums">
                {tmPct}%
              </span>
            </div>
          </Field>
          <Result
            label="Training max (TM)"
            value={fmt(tm)}
            unit={unit}
            sub={`${tmPct}% of your ${fmt(oneRM)} ${unit} 1RM`}
          />
        </div>
        <InfoNote>
          <p>TM = 1RM × {(tmPct / 100).toFixed(2)} (default 0.90).</p>
          <p>
            Working weights are percentages of the TM, rounded to the nearest{" "}
            {inc} {unit}. Programs like 5/3/1 base every set on a sub-maximal TM
            rather than a true 1RM so the numbers stay repeatable.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Working weights</CardTitle>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">% of TM</th>
                <th className="px-4 py-2 font-medium">Weight ({unit})</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.pct}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-4 py-2 font-medium">{r.pct}%</td>
                  <td className="px-4 py-2">{fmt(r.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </CalcGrid>
  );
}
