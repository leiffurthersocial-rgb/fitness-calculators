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
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import {
  pctOfOneRM,
  oneRMFromRPE,
  weightForRepsAtRPE,
} from "@/lib/formulas";
import { weightUnit, fmt } from "@/lib/units";

const RPE_OPTIONS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
// Rep / RPE grid shown as suggested working loads.
const GRID_REPS = [1, 3, 5, 8, 10];
const GRID_RPE = [10, 9, 8, 7];

export default function RpeConverter() {
  const { units } = useUnits();
  const wu = weightUnit(units);

  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(8);

  const pct = pctOfOneRM(reps, rpe);
  const e1rm = oneRMFromRPE(weight, reps, rpe);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your set</CardTitle>
        <div className="space-y-4">
          <Field label={`Weight lifted (${wu})`}>
            <NumberInput value={weight} onChange={setWeight} suffix={wu} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reps">
              <NumberInput value={reps} onChange={setReps} />
            </Field>
            <Field label="RPE" hint="how hard it felt">
              <Select
                value={String(rpe)}
                onChange={(v) => setRpe(parseFloat(v))}
                options={RPE_OPTIONS.map((r) => ({
                  value: String(r),
                  label: `RPE ${r} · ${10 - r} in reserve`,
                }))}
              />
            </Field>
          </div>
          <Result
            label="Estimated 1RM"
            value={fmt(e1rm)}
            unit={wu}
            sub={`That set was ${fmt(pct, 1)}% of your 1RM`}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="% of 1RM" value={fmt(pct, 1)} unit="%" />
            <Stat label="Reps in reserve" value={fmt(10 - rpe, 1)} />
          </div>
        </div>
        <InfoNote>
          <p>
            RPE (rate of perceived exertion) on the 10-point scale = how many
            reps you had left: RPE 8 means 2 reps in reserve. The full
            RTS/Helms chart collapses to one curve in &quot;effective reps&quot;
            = reps + reps-in-reserve, which sets %1RM.
          </p>
          <p>1RM = weight ÷ (%1RM ÷ 100). Best within ~6 effective reps.</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Working weights from your 1RM</CardTitle>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
          Loads to hit each rep target at a given RPE, from your estimated 1RM of{" "}
          <strong>{fmt(e1rm)} {wu}</strong>.
        </p>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-3 py-2 font-medium">RPE</th>
                {GRID_REPS.map((r) => (
                  <th key={r} className="px-3 py-2 font-medium">{r} rep{r > 1 ? "s" : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRID_RPE.map((gr) => (
                <tr key={gr} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 font-medium">{gr}</td>
                  {GRID_REPS.map((r) => (
                    <td key={r} className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {fmt(weightForRepsAtRPE(e1rm, r, gr))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Rounds to the nearest small amount in practice — load the closest you
          can. Higher RPE = closer to failure = heavier for the same reps.
        </p>
      </Card>
    </CalcGrid>
  );
}
