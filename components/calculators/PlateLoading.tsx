"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  InfoNote,
  CalcGrid,
  Badge,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { platesPerSide } from "@/lib/formulas";
import { weightUnit, fmt } from "@/lib/units";

// Standard plate sets per unit system.
const PLATES: Record<string, number[]> = {
  metric: [25, 20, 15, 10, 5, 2.5, 1.25],
  imperial: [45, 35, 25, 10, 5, 2.5],
};

// A rough color per plate so the bar reads at a glance.
const plateColor = (p: number) => {
  const palette = [
    "bg-red-500",
    "bg-blue-500",
    "bg-yellow-500",
    "bg-green-600",
    "bg-zinc-500",
    "bg-purple-500",
    "bg-pink-500",
  ];
  const keys = [45, 25, 20, 15, 10, 5, 2.5, 1.25, 35];
  const idx = keys.indexOf(p);
  return palette[(idx < 0 ? 0 : idx) % palette.length];
};

export default function PlateLoading() {
  const { profile } = useProfile();
  const unit = weightUnit(profile.units);
  const defaultBar = profile.units === "metric" ? 20 : 45;
  const [target, setTarget] = useState(profile.units === "metric" ? 100 : 225);
  const [bar, setBar] = useState(defaultBar);
  const [enabled, setEnabled] = useState<Record<number, boolean>>(
    Object.fromEntries(PLATES[profile.units].map((p) => [p, true]))
  );

  const available = PLATES[profile.units].filter((p) => enabled[p]);
  const { plates, achievable, loadedTotal } = platesPerSide(target, bar, available);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Setup</CardTitle>
        <div className="space-y-4">
          <Field label={`Target weight (${unit})`}>
            <NumberInput value={target} onChange={setTarget} step={2.5} suffix={unit} />
          </Field>
          <Field label={`Bar weight (${unit})`}>
            <NumberInput value={bar} onChange={setBar} step={2.5} suffix={unit} />
          </Field>
          <Field label="Available plates (per side)">
            <div className="flex flex-wrap gap-2">
              {PLATES[profile.units].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setEnabled((prev) => ({ ...prev, [p]: !prev[p] }))
                  }
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition " +
                    (enabled[p]
                      ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
                      : "border-zinc-300 text-zinc-400 line-through dark:border-zinc-700")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <InfoNote>
          <p>
            We subtract the bar, split the remainder across two sides, then
            greedily fill from the heaviest available plate down.
          </p>
          <p>
            If the remainder can&apos;t be matched exactly, we flag it and show
            the closest loadable weight.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Load each side</CardTitle>
        {plates.length === 0 && achievable ? (
          <p className="text-sm text-zinc-500">
            Just the empty bar — no plates needed.
          </p>
        ) : (
          <>
            {/* Visual bar */}
            <div className="mb-4 flex items-center">
              <div className="h-1.5 w-6 rounded bg-zinc-400" />
              {plates.map((p, i) => (
                <div
                  key={i}
                  title={`${p} ${unit}`}
                  className={
                    "mx-px rounded-sm " + plateColor(p)
                  }
                  style={{ height: 24 + p, width: 10 }}
                />
              ))}
              <div className="h-1.5 flex-1 rounded bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="flex flex-wrap gap-2">
              {plates.map((p, i) => (
                <Badge key={i} tone="neutral">
                  {p} {unit}
                </Badge>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Plates per side</span>
            <span className="font-medium">
              {plates.length} ({fmt(plates.reduce((s, p) => s + p, 0))} {unit})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Actual total</span>
            <span className="font-medium">
              {fmt(loadedTotal)} {unit}
            </span>
          </div>
        </div>

        {!achievable && (
          <div className="mt-3">
            <Badge tone="warn">
              Can&apos;t hit {fmt(target)} {unit} exactly — closest is{" "}
              {fmt(loadedTotal)} {unit}
            </Badge>
          </div>
        )}
      </Card>
    </CalcGrid>
  );
}
