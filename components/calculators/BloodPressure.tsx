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
  Badge,
} from "../ui";
import { bloodPressureCategory } from "@/lib/formulas";

// The ACC/AHA category ladder, drawn as a reference scale.
const LADDER = [
  { label: "Low", range: "< 90 / 60", tone: "warn" as const },
  { label: "Normal", range: "< 120 / 80", tone: "accent" as const },
  { label: "Elevated", range: "120–129 / < 80", tone: "warn" as const },
  { label: "Stage 1", range: "130–139 / 80–89", tone: "warn" as const },
  { label: "Stage 2", range: "≥ 140 / 90", tone: "danger" as const },
  { label: "Crisis", range: "≥ 180 / 120", tone: "danger" as const },
];

export default function BloodPressure() {
  const [systolic, setSystolic] = useState(118);
  const [diastolic, setDiastolic] = useState(76);

  const r = bloodPressureCategory(systolic, diastolic);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Reading</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Systolic (top)">
              <NumberInput value={systolic} onChange={setSystolic} suffix="mmHg" />
            </Field>
            <Field label="Diastolic (bottom)">
              <NumberInput value={diastolic} onChange={setDiastolic} suffix="mmHg" />
            </Field>
          </div>
          <Result
            label="Category"
            value={r.category}
            sub={`${systolic}/${diastolic} mmHg`}
          />
          <div>
            <Badge tone={r.tone === "danger" ? "warn" : r.tone}>{r.advice}</Badge>
          </div>
        </div>
        <InfoNote>
          <p>
            Categories follow the 2017 ACC/AHA guidelines. The higher of the two
            numbers&apos; categories applies — e.g. 118/85 still counts as Stage 1
            on the diastolic reading.
          </p>
          <p>
            A single reading isn&apos;t a diagnosis. Measure at rest, and average a
            few readings across days for a true picture. Not medical advice.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Reference scale</CardTitle>
        <div className="space-y-2">
          {LADDER.map((l) => {
            const active = l.label.toLowerCase().includes(
              r.category.toLowerCase().replace("hypertension ", "").replace("hypertensive ", "")
            ) ||
              (l.label === "Stage 1" && r.category === "Hypertension stage 1") ||
              (l.label === "Stage 2" && r.category === "Hypertension stage 2") ||
              (l.label === "Crisis" && r.category === "Hypertensive crisis");
            return (
              <div
                key={l.label}
                className={
                  "flex items-center justify-between rounded-xl border px-4 py-2.5 " +
                  (active
                    ? "border-accent-400 bg-accent-50 ring-1 ring-accent-300 dark:border-accent-700 dark:bg-accent-900/20 dark:ring-accent-800"
                    : "border-zinc-200 dark:border-zinc-800")
                }
              >
                <span className="text-sm font-medium">{l.label}</span>
                <span className="text-sm text-zinc-500">{l.range}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </CalcGrid>
  );
}
