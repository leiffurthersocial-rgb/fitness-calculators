"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Select,
  Result,
  InfoNote,
  CalcGrid,
  Tip,
} from "../ui";
import { useUnits } from "@/lib/settings";
import {
  vdotFromRace,
  runTrainingPaces,
  timeForVdotAtDistance,
  paceSecPerKm,
} from "@/lib/formulas";
import {
  parseTimeToSeconds,
  fmtTime,
  fmtPace,
  milesToM,
  fmt,
} from "@/lib/units";

type Method = "race" | "cooper" | "vo2";

// Colour per zone: Easy → Repetition (easy/aerobic = cool, fast = hot).
const ZONE_COLORS = ["#22c55e", "#10b981", "#f59e0b", "#f97316", "#ef4444"];

// Distances you can enter a result for, and the equivalent-times table.
const RACES = [
  { key: "1500", label: "1500 m", meters: 1500 },
  { key: "mile", label: "1 mile", meters: 1609.344 },
  { key: "5k", label: "5K", meters: 5000 },
  { key: "10k", label: "10K", meters: 10000 },
  { key: "half", label: "Half marathon", meters: 21097.5 },
  { key: "marathon", label: "Marathon", meters: 42195 },
] as const;

const EQUIV = RACES.filter((r) => r.key !== "1500");

export default function RunPaces() {
  const { units } = useUnits();
  const metric = units === "metric";

  const [method, setMethod] = useState<Method>("race");

  // Race method
  const [raceKey, setRaceKey] = useState<string>("5k");
  const [raceTime, setRaceTime] = useState("25:00");
  // Cooper method — distance in 12 min (m or mi to match display unit).
  const [coopDist, setCoopDist] = useState(metric ? 2600 : 1.6);
  // VO2max method
  const [vo2, setVo2] = useState(45);

  let vdot = 0;
  if (method === "race") {
    const meters = RACES.find((r) => r.key === raceKey)!.meters;
    vdot = vdotFromRace(meters, parseTimeToSeconds(raceTime));
  } else if (method === "cooper") {
    const meters = metric ? coopDist : milesToM(coopDist);
    vdot = vdotFromRace(meters, 720);
  } else {
    vdot = vo2;
  }

  const paces = runTrainingPaces(vdot);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your benchmark</CardTitle>
        <div className="space-y-4">
          <Field label="Enter a recent…">
            <Select
              value={method}
              onChange={setMethod}
              options={[
                { value: "race", label: "Race result (most accurate)" },
                { value: "cooper", label: "Cooper 12-minute test" },
                { value: "vo2", label: "Known VO₂max" },
              ]}
            />
          </Field>

          <Tip>
            {method === "race"
              ? "A recent all-out race is the best input — even a hard 5K time zone is enough to set every training pace."
              : method === "cooper"
              ? "Run as far as you can in 12 minutes on a track or measured route, then enter the distance."
              : "Already know your VO₂max from a lab or watch? Drop it in — it's treated as your VDOT directly."}
          </Tip>

          {method === "race" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Distance">
                <Select
                  value={raceKey}
                  onChange={setRaceKey}
                  options={RACES.map((r) => ({ value: r.key, label: r.label }))}
                />
              </Field>
              <Field label="Time (h:mm:ss)">
                <TextInput
                  value={raceTime}
                  onChange={setRaceTime}
                  placeholder="25:00"
                />
              </Field>
            </div>
          )}

          {method === "cooper" && (
            <Field label={`Distance in 12 min (${metric ? "m" : "mi"})`}>
              <NumberInput
                value={coopDist}
                onChange={setCoopDist}
                step={metric ? 50 : 0.1}
              />
            </Field>
          )}

          {method === "vo2" && (
            <Field label="VO₂max (ml/kg/min)">
              <NumberInput value={vo2} onChange={setVo2} step={0.5} suffix="ml/kg/min" />
            </Field>
          )}

          <Result
            label="VDOT (fitness score)"
            value={vdot > 0 ? fmt(vdot, 1) : "—"}
            sub="A VO₂max-equivalent number that sets all your paces"
          />
        </div>
        <InfoNote>
          <p>
            Paces use Jack Daniels&apos; VDOT. From your result we derive VDOT
            via the Daniels–Gilbert equations, then each zone is a calibrated
            percentage of your velocity at VO₂max.
          </p>
          <p>
            VO₂ cost = −4.6 + 0.182258·v + 0.000104·v² (v in m/min); the
            sustainable fraction of VO₂max falls with race duration.
          </p>
          <p>
            These are guides to train <em>around</em>, not lab-exact targets.
            Cross-reference them with the Heart-rate zones tool.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Training paces</CardTitle>
        {vdot > 0 ? (
          <>
            <div className="space-y-3">
              {paces.map((p, i) => {
                const single =
                  Math.round(p.fastSecPerKm) === Math.round(p.slowSecPerKm);
                return (
                  <div key={p.zone.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ZONE_COLORS[i] }}
                        />
                        {p.zone.name}
                      </span>
                      <span className="tabular-nums text-sm font-semibold">
                        {single
                          ? fmtPace(p.fastSecPerKm, units)
                          : `${fmtPace(p.fastSecPerKm, units).replace(
                              / \/.*/,
                              ""
                            )}–${fmtPace(p.slowSecPerKm, units)}`}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">{p.zone.trains}</div>
                  </div>
                );
              })}
            </div>

            <h4 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Equivalent race times
            </h4>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Race</th>
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {EQUIV.map((r) => {
                    const t = timeForVdotAtDistance(vdot, r.meters);
                    const isEntered = method === "race" && r.key === raceKey;
                    return (
                      <tr
                        key={r.key}
                        className={
                          "border-t border-zinc-100 dark:border-zinc-800 " +
                          (isEntered ? "bg-accent-50 dark:bg-accent-900/20" : "")
                        }
                      >
                        <td className="px-4 py-2 font-medium">{r.label}</td>
                        <td className="px-4 py-2">{fmtTime(t)}</td>
                        <td className="px-4 py-2 text-zinc-500">
                          {fmtPace(paceSecPerKm(t, r.meters), units)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Equivalents assume you&apos;re trained for each distance — your
              real marathon will drift slower without the long-run mileage.
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Enter a valid result on the left to see your paces.
          </p>
        )}
      </Card>
    </CalcGrid>
  );
}
