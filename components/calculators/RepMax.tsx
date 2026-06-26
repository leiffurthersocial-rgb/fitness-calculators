"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  Select,
  InfoNote,
  CalcGrid,
  Badge,
  Tip,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { estimate1RM, repMaxTable, type OneRMFormula } from "@/lib/formulas";
import { weightUnit, fmt } from "@/lib/units";

export default function RepMax() {
  const { profile } = useProfile();
  const unit = weightUnit(profile.units);
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(5);
  const [formula, setFormula] = useState<OneRMFormula>("average");

  // Work directly in the display unit here — 1RM math is unit-agnostic since
  // it just scales the input weight, so no kg conversion is needed.
  const oneRM = estimate1RM(weight, reps, formula);
  const table = repMaxTable(oneRM, 10);
  const highlight = new Set([1, 3, 5]);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your set</CardTitle>
        <div className="space-y-4">
          <Field label={`Weight lifted (${unit})`}>
            <NumberInput value={weight} onChange={setWeight} step={2.5} suffix={unit} />
          </Field>
          <Field label="Reps performed">
            <NumberInput value={reps} onChange={setReps} min={1} max={20} />
          </Field>
          <Field label="Formula">
            <Select
              value={formula}
              onChange={setFormula}
              options={[
                { value: "average", label: "Average (Epley + Brzycki)" },
                { value: "epley", label: "Epley" },
                { value: "brzycki", label: "Brzycki" },
              ]}
            />
          </Field>
          <Result label="Estimated 1RM" value={fmt(oneRM)} unit={unit} />
          <Tip>
            Keep <strong>Average</strong> for everyday use — it&apos;s the most
            reliable across rep ranges. Brzycki reads a touch lower at high reps,
            Epley a touch higher. For the best estimate, test a set of{" "}
            <strong>5 reps or fewer</strong>.
          </Tip>
        </div>
        <InfoNote>
          <p>Epley: 1RM = w × (1 + reps/30).</p>
          <p>Brzycki: 1RM = w × 36 / (37 − reps).</p>
          <p>
            “Average” takes the mean of both, which tends to be more robust
            across rep ranges. Estimates are most accurate at ≤ 10 reps.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Rep-max table</CardTitle>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">Reps</th>
                <th className="px-4 py-2 font-medium">Est. weight ({unit})</th>
                <th className="px-4 py-2 font-medium">% of 1RM</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr
                  key={row.reps}
                  className={
                    "border-t border-zinc-100 dark:border-zinc-800 " +
                    (highlight.has(row.reps)
                      ? "bg-accent-50 dark:bg-accent-900/20"
                      : "")
                  }
                >
                  <td className="px-4 py-2 font-medium">
                    {row.reps}
                    {highlight.has(row.reps) && (
                      <span className="ml-2">
                        <Badge>{row.reps}RM</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{fmt(row.weight)}</td>
                  <td className="px-4 py-2 text-zinc-500">
                    {fmt((row.weight / oneRM) * 100, 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </CalcGrid>
  );
}
