"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Result,
  Select,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { riegelPredict, paceSecPerKm } from "@/lib/formulas";
import {
  parseTimeToSeconds,
  fmtTime,
  fmtPace,
  milesToM,
  mToMiles,
  fmt,
} from "@/lib/units";

// Common race distances in meters.
const RACES = [
  { key: "5k", label: "5K", meters: 5000 },
  { key: "10k", label: "10K", meters: 10000 },
  { key: "half", label: "Half marathon", meters: 21097.5 },
  { key: "marathon", label: "Marathon", meters: 42195 },
] as const;

export default function PaceRace() {
  const { profile } = useProfile();
  const metric = profile.units === "metric";

  // --- Pace calculator: enter distance + time, get pace. ---
  const [distance, setDistance] = useState(metric ? 10 : 6.2); // km or mi
  const [timeStr, setTimeStr] = useState("50:00");
  const distM = metric ? distance * 1000 : milesToM(distance);
  const timeSec = parseTimeToSeconds(timeStr);
  const pace = paceSecPerKm(timeSec, distM);

  // --- Race predictor (Riegel) ---
  const [knownRace, setKnownRace] = useState<string>("10k");
  const [knownTime, setKnownTime] = useState("50:00");
  const knownMeters = RACES.find((r) => r.key === knownRace)!.meters;
  const knownSec = parseTimeToSeconds(knownTime);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Pace calculator</CardTitle>
        <div className="space-y-4">
          <Field label={`Distance (${metric ? "km" : "mi"})`}>
            <NumberInput value={distance} onChange={setDistance} step={0.1} />
          </Field>
          <Field label="Time (h:mm:ss or mm:ss)">
            <TextInput value={timeStr} onChange={setTimeStr} placeholder="50:00" />
          </Field>
          <Result label="Pace" value={fmtPace(pace, profile.units)} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <div className="text-xs text-zinc-500">Speed</div>
              <div className="font-semibold">
                {fmt(
                  metric
                    ? distM / 1000 / (timeSec / 3600)
                    : mToMiles(distM) / (timeSec / 3600)
                )}{" "}
                {metric ? "km/h" : "mph"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <div className="text-xs text-zinc-500">Total time</div>
              <div className="font-semibold">{fmtTime(timeSec)}</div>
            </div>
          </div>
        </div>
        <InfoNote>
          <p>Pace = time ÷ distance. Speed is the inverse.</p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Race predictor (Riegel)</CardTitle>
        <div className="space-y-4">
          <Field label="Known race">
            <Select
              value={knownRace}
              onChange={setKnownRace}
              options={RACES.map((r) => ({ value: r.key, label: r.label }))}
            />
          </Field>
          <Field label="Your time (h:mm:ss)">
            <TextInput value={knownTime} onChange={setKnownTime} placeholder="50:00" />
          </Field>

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Race</th>
                  <th className="px-4 py-2 font-medium">Predicted</th>
                  <th className="px-4 py-2 font-medium">Pace</th>
                </tr>
              </thead>
              <tbody>
                {RACES.map((r) => {
                  const predicted =
                    r.key === knownRace
                      ? knownSec
                      : riegelPredict(knownSec, knownMeters, r.meters);
                  return (
                    <tr
                      key={r.key}
                      className={
                        "border-t border-zinc-100 dark:border-zinc-800 " +
                        (r.key === knownRace
                          ? "bg-accent-50 dark:bg-accent-900/20"
                          : "")
                      }
                    >
                      <td className="px-4 py-2 font-medium">{r.label}</td>
                      <td className="px-4 py-2">{fmtTime(predicted)}</td>
                      <td className="px-4 py-2 text-zinc-500">
                        {fmtPace(paceSecPerKm(predicted, r.meters), profile.units)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <InfoNote>
          <p>Riegel: T₂ = T₁ × (D₂ / D₁)^1.06.</p>
          <p>
            The 1.06 fatigue exponent assumes you train for the longer distance.
            Predictions drift if you extrapolate very far from your known race.
          </p>
        </InfoNote>
      </Card>
    </CalcGrid>
  );
}
