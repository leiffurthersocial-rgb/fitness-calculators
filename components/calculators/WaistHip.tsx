"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  Result,
  SegmentedControl,
  InfoNote,
  CalcGrid,
  Badge,
} from "../ui";
import { useProfile } from "@/lib/profile";
import { waistToHip, whrCategory } from "@/lib/formulas";
import { lengthToCm, smallLengthUnit, fmt } from "@/lib/units";

export default function WaistHip() {
  const { profile } = useProfile();
  const su = smallLengthUnit(profile.units);

  const [sex, setSex] = useState<"male" | "female">(profile.sex);
  const [waist, setWaist] = useState(profile.units === "metric" ? 85 : 33);
  const [hip, setHip] = useState(profile.units === "metric" ? 100 : 39);

  const waistCm = lengthToCm(waist, profile.units);
  const hipCm = lengthToCm(hip, profile.units);
  const ratio = waistToHip(waistCm, hipCm);
  const category = whrCategory(ratio, sex);
  const shape = ratio >= (sex === "male" ? 0.95 : 0.85) ? "Apple" : "Pear";

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Measurements</CardTitle>
        <div className="space-y-4">
          <Field label="Sex">
            <SegmentedControl
              value={sex}
              onChange={setSex}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Waist (${su})`} hint="at navel">
              <NumberInput value={waist} onChange={setWaist} suffix={su} />
            </Field>
            <Field label={`Hip (${su})`} hint="widest point">
              <NumberInput value={hip} onChange={setHip} suffix={su} />
            </Field>
          </div>
          <Result label="Waist-to-hip ratio" value={fmt(ratio, 2)} sub={`${category} · ${shape}-shaped`} />
          <div>
            <Badge tone={category === "Low risk" ? "accent" : "warn"}>{category}</Badge>
          </div>
        </div>
        <InfoNote>
          <p>WHR = waist ÷ hip (same unit).</p>
          <p>
            WHO risk thresholds: men ≥ 0.90 / women ≥ 0.85 raise cardiometabolic
            risk. WHR captures fat distribution — visceral “apple” fat around the
            middle is riskier than “pear” fat on the hips.
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Risk bands ({sex === "male" ? "men" : "women"})</CardTitle>
        <div className="space-y-2">
          {(sex === "male"
            ? [
                { label: "Low risk", range: "< 0.90" },
                { label: "Moderate risk", range: "0.90 – 0.99" },
                { label: "High risk", range: "≥ 1.00" },
              ]
            : [
                { label: "Low risk", range: "< 0.80" },
                { label: "Moderate risk", range: "0.80 – 0.84" },
                { label: "High risk", range: "≥ 0.85" },
              ]
          ).map((b) => (
            <div
              key={b.label}
              className={
                "flex items-center justify-between rounded-xl border px-4 py-2.5 " +
                (b.label === category
                  ? "border-accent-400 bg-accent-50 ring-1 ring-accent-300 dark:border-accent-700 dark:bg-accent-900/20 dark:ring-accent-800"
                  : "border-zinc-200 dark:border-zinc-800")
              }
            >
              <span className="text-sm font-medium">{b.label}</span>
              <span className="text-sm text-zinc-500">{b.range}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Pair with waist-to-height (in Body composition) for a fuller picture.
          Not a diagnosis.
        </p>
      </Card>
    </CalcGrid>
  );
}
