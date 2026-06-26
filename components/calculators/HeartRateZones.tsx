"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  InfoNote,
  CalcGrid,
  SegmentedControl,
  Result,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { maxHRTanaka, maxHRClassic, hrZones } from "@/lib/formulas";
import { fmt } from "@/lib/units";

const ZONE_COLORS = ["#94a3b8", "#22c55e", "#10b981", "#f59e0b", "#ef4444"];

export default function HeartRateZones() {
  const { profile } = useProfile();
  const [age, setAge] = useState(profile.age);
  const [restingHR, setRestingHR] = useState(profile.restingHR);
  const [maxFormula, setMaxFormula] = useState<"tanaka" | "classic">("tanaka");
  const [method, setMethod] = useState<"karvonen" | "percent">("karvonen");

  const maxHR = maxFormula === "tanaka" ? maxHRTanaka(age) : maxHRClassic(age);
  const zones = hrZones(maxHR, restingHR, method);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Inputs</CardTitle>
        <div className="space-y-4">
          <Field label="Age">
            <NumberInput value={age} onChange={setAge} />
          </Field>
          <Field label="Resting HR (bpm)" hint="needed for Karvonen">
            <NumberInput value={restingHR} onChange={setRestingHR} suffix="bpm" />
          </Field>
          <Field label="Max HR formula">
            <SegmentedControl
              value={maxFormula}
              onChange={setMaxFormula}
              options={[
                { value: "tanaka", label: "Tanaka" },
                { value: "classic", label: "220 − age" },
              ]}
            />
          </Field>
          <Field label="Zone method">
            <SegmentedControl
              value={method}
              onChange={setMethod}
              options={[
                { value: "karvonen", label: "Karvonen (HRR)" },
                { value: "percent", label: "% of max" },
              ]}
            />
          </Field>
          <Result label="Estimated max HR" value={fmt(maxHR, 0)} unit="bpm" />
        </div>
        <InfoNote>
          <p>Tanaka: maxHR = 208 − 0.7 × age (more accurate than 220 − age).</p>
          <p>
            Karvonen: target = (maxHR − restingHR) × intensity + restingHR. It
            uses your heart-rate reserve, so it personalises zones to your
            fitness.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Training zones</CardTitle>
        <div className="space-y-2">
          {zones.map((z, i) => {
            const widthPct = z.highPct * 100;
            return (
              <div key={z.zone}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Z{z.zone} · {z.name}
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    {fmt(z.lowBpm, 0)}–{fmt(z.highBpm, 0)} bpm
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="flex h-full items-center pl-2 text-xs font-medium text-white"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: ZONE_COLORS[i],
                    }}
                  >
                    {z.lowPct * 100}–{z.highPct * 100}%
                  </div>
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">{z.trains}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </CalcGrid>
  );
}
