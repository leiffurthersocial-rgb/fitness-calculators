"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  TextInput,
  Select,
  NumberInput,
  SegmentedControl,
  Result,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { raceSplits, paceSecPerKm } from "@/lib/formulas";
import { parseTimeToSeconds, fmtTime, fmtPace, M_PER_MILE } from "@/lib/units";

const RACES = [
  { key: "5k", label: "5K", meters: 5000 },
  { key: "10k", label: "10K", meters: 10000 },
  { key: "half", label: "Half marathon", meters: 21097.5 },
  { key: "marathon", label: "Marathon", meters: 42195 },
] as const;

export default function RaceSplits() {
  const { units } = useUnits();
  const metric = units === "metric";
  const per = metric ? "km" : "mi";
  const segM = metric ? 1000 : M_PER_MILE;

  const [raceKey, setRaceKey] = useState<string>("10k");
  const [goal, setGoal] = useState("45:00");
  const [strategy, setStrategy] = useState<"even" | "negative">("even");
  const [negPct, setNegPct] = useState(3);

  const distM = RACES.find((r) => r.key === raceKey)!.meters;
  const goalSec = parseTimeToSeconds(goal);
  const splits = raceSplits(goalSec, distM, segM, strategy === "negative" ? negPct : 0);
  const avgPace = paceSecPerKm(goalSec, distM);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Goal</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Race">
              <Select
                value={raceKey}
                onChange={setRaceKey}
                options={RACES.map((r) => ({ value: r.key, label: r.label }))}
              />
            </Field>
            <Field label="Goal time (h:mm:ss)">
              <TextInput value={goal} onChange={setGoal} placeholder="45:00" />
            </Field>
          </div>
          <Field label="Strategy">
            <SegmentedControl
              value={strategy}
              onChange={setStrategy}
              options={[
                { value: "even", label: "Even" },
                { value: "negative", label: "Negative" },
              ]}
            />
          </Field>
          {strategy === "negative" && (
            <Field label="Negative split (%)" hint="back half faster">
              <NumberInput value={negPct} onChange={setNegPct} suffix="%" />
            </Field>
          )}
          <Result label="Average pace" value={fmtPace(avgPace, units)} />
        </div>
        <InfoNote>
          <p>
            Splits ramp linearly from slightly slower to faster (a negative
            split), normalised so they total your goal exactly. Most personal
            bests are run with a slight negative split — going out too hard is
            the classic blow-up.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Split sheet</CardTitle>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 font-medium">{per === "km" ? "Km" : "Mile"}</th>
                <th className="px-4 py-2 font-medium">Split</th>
                <th className="px-4 py-2 font-medium">Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((s, i) => (
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-medium">
                    {metric
                      ? (s.distM / 1000).toFixed(s.distM % 1000 === 0 ? 0 : 2)
                      : (s.distM / M_PER_MILE).toFixed(s.distM % M_PER_MILE < 1 ? 0 : 2)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{fmtTime(s.segSec)}</td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">{fmtTime(s.cumSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Final elapsed: <strong>{fmtTime(goalSec)}</strong>.
        </p>
      </Card>
    </CalcGrid>
  );
}
