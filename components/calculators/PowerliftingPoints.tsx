"use client";

import { useState } from "react";
import {
  Card,
  CardTitle,
  Field,
  NumberInput,
  SegmentedControl,
  Result,
  Stat,
  InfoNote,
  CalcGrid,
} from "../ui";
import { useUnits } from "@/lib/settings";
import { useProfile, useWeightField } from "@/lib/profile";
import { powerliftingPoints } from "@/lib/formulas";
import { weightFromKg, weightToKg, weightUnit, fmt } from "@/lib/units";

const SEED_KG: Record<string, number> = { squat: 200, bench: 140, deadlift: 240 };

export default function PowerliftingPoints() {
  const { units } = useUnits();
  const wu = weightUnit(units);
  const { profile, patch } = useProfile();
  const [bw, setBw] = useWeightField(units);

  const [lifts, setLifts] = useState<Record<string, number>>(() => ({
    squat: Math.round(weightFromKg(SEED_KG.squat, units)),
    bench: Math.round(weightFromKg(SEED_KG.bench, units)),
    deadlift: Math.round(weightFromKg(SEED_KG.deadlift, units)),
  }));

  const totalDisplay = lifts.squat + lifts.bench + lifts.deadlift;
  const totalKg = weightToKg(totalDisplay, units);
  const p = powerliftingPoints(totalKg, weightToKg(bw, units), profile.sex);

  return (
    <CalcGrid>
      <Card>
        <CardTitle>Your total</CardTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex">
              <SegmentedControl
                value={profile.sex}
                onChange={(v) => patch({ sex: v })}
                options={[
                  { value: "male", label: "M" },
                  { value: "female", label: "F" },
                ]}
              />
            </Field>
            <Field label={`Bodyweight (${wu})`}>
              <NumberInput value={bw} onChange={setBw} suffix={wu} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["squat", "bench", "deadlift"] as const).map((k) => (
              <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} (${wu})`}>
                <NumberInput
                  value={lifts[k]}
                  onChange={(v) => setLifts((prev) => ({ ...prev, [k]: v }))}
                  step={2.5}
                  suffix={wu}
                />
              </Field>
            ))}
          </div>
          <Stat label="Competition total" value={fmt(totalDisplay, 0)} unit={wu} />
        </div>
        <InfoNote>
          <p>
            All three are bodyweight-adjusted &ldquo;pound-for-pound&rdquo;
            scores, so lifters of different sizes can be compared on one number.
          </p>
          <p>
            <strong>Wilks</strong> is the classic coefficient; <strong>DOTS</strong>{" "}
            is its modern successor; <strong>IPF GL points</strong> are the IPF&rsquo;s
            current official formula (shown here for classic / raw full-power).
          </p>
        </InfoNote>
      </Card>

      <Card>
        <CardTitle>Your points</CardTitle>
        <Result
          label="DOTS"
          value={fmt(p.dots, 1)}
          sub="modern bodyweight-adjusted score · ~500 is world class"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Wilks" value={fmt(p.wilks, 1)} />
          <Stat label="IPF GL points" value={fmt(p.ipfGl, 1)} />
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Rough reference: ~300 solid intermediate, ~400 advanced, ~500+ elite /
          national-class. Women&rsquo;s and men&rsquo;s coefficients differ, so a
          given score means the same level for either.
        </p>
      </Card>
    </CalcGrid>
  );
}
