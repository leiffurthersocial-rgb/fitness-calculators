"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  TextInput,
  Result,
  InfoNote,
  CalcGrid,
} from "../ui";
import { criticalSwimSpeed, swimZones } from "@/lib/formulas";
import { parseTimeToSeconds, fmtTime, fmt } from "@/lib/units";

const ZONE_COLORS = ["#22c55e", "#10b981", "#f59e0b", "#f97316", "#ef4444"];

export default function SwimZones() {
  const [longDist, setLongDist] = useState(400);
  const [longTime, setLongTime] = useState("6:40");
  const [shortDist, setShortDist] = useState(200);
  const [shortTime, setShortTime] = useState("3:10");

  const css = criticalSwimSpeed(
    longDist,
    parseTimeToSeconds(longTime),
    shortDist,
    parseTimeToSeconds(shortTime)
  );
  const cssPer100 = css > 0 ? 100 / css : 0;
  const zones = swimZones(css);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Two time trials</CardTitle>
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Swim two hard, evenly-paced efforts — a longer and a shorter — fully
            rested between. The classic pairing is 400 m and 200 m.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Long distance (m)">
              <NumberInput value={longDist} onChange={setLongDist} suffix="m" />
            </Field>
            <Field label="Long time (m:ss)">
              <TextInput value={longTime} onChange={setLongTime} placeholder="6:40" />
            </Field>
            <Field label="Short distance (m)">
              <NumberInput value={shortDist} onChange={setShortDist} suffix="m" />
            </Field>
            <Field label="Short time (m:ss)">
              <TextInput value={shortTime} onChange={setShortTime} placeholder="3:10" />
            </Field>
          </div>
        </div>
        <InfoNote>
          <p>
            Critical Swim Speed = (D₁ − D₂) ÷ (T₁ − T₂) — the slope of your two
            trials, a practical stand-in for swimming threshold pace.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your pace zones</CardTitle>
        {css > 0 ? (
          <>
            <Result
              label="Critical Swim Speed"
              value={fmtTime(cssPer100)}
              unit="/100 m"
              sub={`${fmt(css, 2)} m/s`}
            />
            <div className="mt-4 space-y-2">
              {zones.map((z, i) => (
                <div key={z.zone.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[i] }} />
                    {z.zone.name}
                    <span className="text-xs font-normal text-zinc-400">{z.zone.desc}</span>
                  </span>
                  <span className="tabular-nums text-sm font-semibold">
                    {fmtTime(z.fastSecPer100)}–{fmtTime(z.slowSecPer100)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-400">Paces are per 100 m.</p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Enter two trials where the longer swim is slower per 100 m.
          </p>
        )}
      </Card>
    </CalcGrid>
  );
}
